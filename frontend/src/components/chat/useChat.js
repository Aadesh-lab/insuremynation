import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Chat state and transport for the assistant panel.
 *
 * Talks to this site's own backend (`backend/`), which proxies the imagine.bo RAG
 * API and holds the API key. Three things it deliberately does differently from the
 * hosted widget we replaced:
 *
 *   1. It reads error bodies. The backend returns considered messages — a per-visitor
 *      cap, an unconfigured key, an upstream outage — and the widget threw all of
 *      them away in favour of "Something went wrong", which made a rate limit
 *      indistinguishable from a crash.
 *   2. A session is an optimisation, not a prerequisite. `/v1/query` accepts a null
 *      session_id, so if minting one fails the conversation still works; it just
 *      isn't persisted server-side. The widget blocked its own input until a session
 *      existed, which presented as a chat box you could not type in.
 *   3. It never sends `kb_id`. The backend pins the knowledge base server-side and
 *      ignores anything the browser supplies, so there is nothing to discover and no
 *      picker to click through.
 */

const SESSION_KEY = 'imn-chat-session-id';

/** Matches the cap the backend applies to history, so we send what it will keep. */
const MAX_HISTORY = 10;

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/** Reads the backend's own `{"error":"..."}` message, falling back if absent. */
async function errorMessage(res) {
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string' && body.error) return body.error;
  } catch {
    // Not JSON — fall through.
  }
  return GENERIC_ERROR;
}

function loadSessionId() {
  try {
    return window.localStorage.getItem(SESSION_KEY) || null;
  } catch {
    // Private mode / storage disabled. A session is optional, so carry on without.
    return null;
  }
}

function saveSessionId(id) {
  try {
    if (id) window.localStorage.setItem(SESSION_KEY, id);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Parses an SSE byte stream, invoking `onText` per token and returning the sources
 * from the terminal frame.
 *
 * Written against what the backend actually emits: `data: {...}` frames carrying
 * `text`/`done`/`sources`, a `data: [DONE]` sentinel, and blank separator lines. The
 * final chunk may arrive without a trailing newline, so the buffer is flushed at the
 * end rather than discarded — dropping it would silently truncate the last token.
 */
async function readSSE(res, onText, signal) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sources = [];
  let done = false;

  const handleLine = (raw) => {
    const line = raw.trim();
    if (!line.startsWith('data:')) return;
    const payload = line.slice(5).trim();
    if (!payload) return;
    if (payload === '[DONE]') {
      done = true;
      return;
    }
    let frame;
    try {
      frame = JSON.parse(payload);
    } catch {
      return; // A partial or malformed frame is not worth failing the answer over.
    }
    if (Array.isArray(frame.sources) && frame.sources.length) sources = frame.sources;
    if (frame.text) onText(frame.text);
    if (frame.done) done = true;
  };

  try {
    for (;;) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        handleLine(line);
        if (done) break;
      }
      if (done) break;
    }
    if (!done && buffer) handleLine(buffer);
  } finally {
    // Tell the server we have stopped reading, so it stops paying for tokens.
    if (!signal?.aborted) reader.cancel().catch(() => {});
  }

  return sources;
}

let nextId = 0;
const makeId = () => `m${nextId++}`;

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const sessionRef = useRef(loadSessionId());
  const abortRef = useRef(null);
  const restoredRef = useRef(false);

  // Abort any stream still running when the component goes away, so a closed tab
  // does not leave the backend generating into nothing.
  useEffect(() => () => abortRef.current?.abort(), []);

  /**
   * Restores the previous transcript, or mints a session. Called on first open
   * rather than at mount, so a visitor who never opens the panel costs nothing.
   */
  const init = useCallback(async () => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const existing = sessionRef.current;
    if (existing) {
      try {
        const res = await fetch(`/v1/sessions/${encodeURIComponent(existing)}`);
        if (res.ok) {
          const body = await res.json();
          const restored = Array.isArray(body?.messages) ? body.messages : [];
          if (restored.length) {
            setMessages(
              restored.map((m) => ({
                id: makeId(),
                role: m.role === 'user' ? 'user' : 'assistant',
                text: m.content ?? '',
              }))
            );
            return;
          }
          return; // Known session, empty transcript — the greeting stands.
        }
        // 404 means it expired or belongs to another client now. Start fresh.
        sessionRef.current = null;
        saveSessionId(null);
      } catch {
        sessionRef.current = null;
      }
    }

    try {
      const res = await fetch('/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Chat' }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body?.session_id) {
          sessionRef.current = body.session_id;
          saveSessionId(body.session_id);
        }
      }
      // A failure here is deliberately silent: the conversation works without a
      // session, so there is nothing the visitor needs to know or do.
    } catch {
      /* offline — sending will surface it */
    }
  }, []);

  const send = useCallback(
    async (raw) => {
      const text = raw.trim();
      if (!text || pending) return;

      setError(null);
      const userMsg = { id: makeId(), role: 'user', text };
      const replyId = makeId();

      // History is the transcript *before* this turn, which is what the backend
      // expects; it appends the new message itself.
      const history = messages
        .slice(-MAX_HISTORY)
        .map((m) => ({ role: m.role, content: m.text }));

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: replyId, role: 'assistant', text: '', streaming: true },
      ]);
      setPending(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/v1/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history,
            session_id: sessionRef.current || '',
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(await errorMessage(res));
        if (!res.body) throw new Error(GENERIC_ERROR);

        const append = (chunk) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === replyId ? { ...m, text: m.text + chunk } : m))
          );

        const sources = await readSSE(res, append, controller.signal);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId
              ? {
                  ...m,
                  streaming: false,
                  sources,
                  // An empty answer would render as a blank bubble, which reads as a
                  // broken UI rather than a failure.
                  text: m.text || "I don't have an answer for that. Please try rephrasing.",
                }
              : m
          )
        );
      } catch (err) {
        if (err?.name === 'AbortError') return;
        // The failed turn is removed and the message handed back to the composer,
        // so a rate-limited visitor can retry without retyping.
        setMessages((prev) => prev.filter((m) => m.id !== replyId && m.id !== userMsg.id));
        setError({ message: err?.message || GENERIC_ERROR, retry: text });
      } finally {
        setPending(false);
        abortRef.current = null;
      }
    },
    [messages, pending]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    sessionRef.current = null;
    saveSessionId(null);
    restoredRef.current = false;
  }, []);

  return { messages, pending, error, send, init, reset, clearError: () => setError(null) };
}
