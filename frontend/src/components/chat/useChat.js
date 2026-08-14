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

/**
 * sessionStorage, not localStorage, and the distinction is a privacy one.
 *
 * People ask this assistant about health conditions, claim disputes and money. With
 * localStorage the transcript came back on a hard refresh, a browser restart, and —
 * the case that actually matters — for the next person to use a shared computer. The
 * backend scopes session reads by client IP, which stops another network reading a
 * conversation but is no help at all on one shared machine.
 *
 * Per-tab is the balance: refreshing mid-conversation does not throw the thread away,
 * closing the tab does.
 *
 * Note what this does NOT change: the upstream still writes each turn to its own
 * message table for as long as the session lives. Stopping that means not sending a
 * session_id at all, since its SavePair only runs when one is present.
 */
const store = () => (typeof window === 'undefined' ? null : window.sessionStorage);

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
    return store()?.getItem(SESSION_KEY) || null;
  } catch {
    // Private mode / storage disabled. A session is optional, so carry on without.
    return null;
  }
}

function saveSessionId(id) {
  try {
    if (id) store()?.setItem(SESSION_KEY, id);
    else store()?.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Parses an SSE byte stream, invoking `onText` per token.
 *
 * Written against what the backend actually emits: `data: {...}` frames carrying
 * `text` and `done`, a `data: [DONE]` sentinel, and blank separator lines. The final
 * chunk may arrive without a trailing newline, so the buffer is flushed at the end
 * rather than discarded — dropping it would silently truncate the last token.
 *
 * Frames also carry a `sources` array, which is deliberately ignored: the knowledge
 * base is one generated file, so the only citation available is the name of a build
 * artefact. Nothing about it is useful to a visitor.
 */
async function readSSE(res, onText, signal) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
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

}

let nextId = 0;
const makeId = () => `m${nextId++}`;

/**
 * @param pageProduct the product id this page is about, or null. It becomes the
 *   conversation's product on the first message and is then frozen: a visitor three
 *   questions into the health funnel who wanders onto /car-insurance should not have the
 *   assistant switch rails mid-flow. `reset()` unfreezes it.
 */
export function useChat(pageProduct) {
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const sessionRef = useRef(loadSessionId());
  const abortRef = useRef(null);
  const restoredRef = useRef(false);
  const [product, setProduct] = useState(null);

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
    async (raw, productOverride) => {
      const text = raw.trim();
      if (!text || pending) return;

      // Locked on the first message. `productOverride` is how a chip on a non-product
      // page declares one — tapping "Health" on the landing page enters the health
      // funnel without a navigation.
      const locked = product ?? productOverride ?? pageProduct ?? null;
      if (locked !== product) setProduct(locked);

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
            // An id, not prompt text. The backend looks it up in an allowlist and
            // ignores anything it does not recognise, so this cannot retarget the
            // assistant — see productPrompts in backend/internal/services/chat.go.
            product: locked || '',
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(await errorMessage(res));
        if (!res.body) throw new Error(GENERIC_ERROR);

        const append = (chunk) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === replyId ? { ...m, text: m.text + chunk } : m))
          );

        await readSSE(res, append, controller.signal);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId
              ? {
                  ...m,
                  streaming: false,
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
    [messages, pending, product, pageProduct]
  );

  /**
   * Discards the conversation and starts a new one.
   *
   * Re-inits rather than only clearing, so the panel is immediately usable instead of
   * waiting for a close-and-reopen to mint a session. Any in-flight answer is aborted
   * first — a visitor clearing the thread does not want the previous reply landing in
   * the new one.
   */
  const reset = useCallback(async () => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setPending(false);
    setProduct(null);
    sessionRef.current = null;
    saveSessionId(null);
    restoredRef.current = false;
    await init();
  }, [init]);

  return {
    messages,
    pending,
    error,
    send,
    init,
    reset,
    clearError: () => setError(null),
    // Frozen once the conversation starts, the current page's product until then.
    product: product ?? pageProduct ?? null,
  };
}
