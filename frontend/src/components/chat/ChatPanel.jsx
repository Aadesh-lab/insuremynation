import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BLUE, DEEP, EMAIL, PHONE } from '../../data/site';
import Message from './Message';

/**
 * The panel is backend-agnostic: `greeting`, `chips` and `finished` come from whichever
 * client chatBackend.js selected, so nothing here knows whether the funnel is ours or the
 * orchestrator's.
 */
export default function ChatPanel({ chat, onClose }) {
  const { messages, pending, error, send, clearError, reset, greeting, chips, finished } = chat;
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Pin to the newest content. Layout effect so the jump happens before paint
  // rather than as a visible scroll on every streamed token.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending, error]);

  const submit = (text, productOverride) => {
    const value = (text ?? draft).trim();
    if (!value || pending) return;
    setDraft('');
    send(value, productOverride);
  };

  return (
    <div
      className="imn-chat-panel"
      role="dialog"
      aria-modal="false"
      aria-label="InsureMyNation Assistant"
      style={{
        position: 'fixed',
        right: 24,
        bottom: 96,
        zIndex: 2147483000,
        width: 380,
        maxWidth: 'calc(100vw - 48px)',
        height: 560,
        maxHeight: 'calc(100vh - 132px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 24px 60px rgba(0,30,71,0.24)',
        fontFamily: 'Poppins,sans-serif',
      }}
    >
      <Header
        onClose={onClose}
        // Only offered once there is something to clear, so it does not sit there
        // inviting a visitor to reset an empty conversation — and always once the
        // conversation is finished, since it is then the only way to start another.
        onReset={messages.length > 0 || finished ? reset : null}
      />

      <div
        ref={scrollRef}
        className="imn-chat-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '16px 16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: '#fff',
        }}
      >
        <DayDivider />

        {/* Empty on the orchestrator path, where the opening message is a real message
            that arrives from `init` rather than something rendered locally. */}
        {greeting && <Message role="assistant" text={greeting} />}
        {messages.map((m) => (
          <Message key={m.id} role={m.role} text={m.text} streaming={m.streaming} />
        ))}

        {error && <ErrorNotice error={error} onRetry={() => { clearError(); submit(error.retry); }} />}
      </div>

      {/* Hidden when the assistant has not offered a choice, and while an error is
          showing so the retry link is the only thing to click. Never the *only* way to
          answer: the composer stays available so a visitor can type "we are four in
          Gurgaon" instead of picking from the list. */}
      {chips && !error && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            padding: '4px 16px 12px',
          }}
        >
          {chips.map((s) => (
            <button
              key={s.label}
              type="button"
              className="imn-chat-chip"
              disabled={pending}
              onClick={() => submit(s.message, s.product)}
              // Our own chips are short labels standing in for a full sentence, and a
              // screen reader announcing only "Health" says nothing about what tapping it
              // does. The orchestrator's chips send their label verbatim, so there the
              // visible text already is the message and repeating it would be noise.
              aria-label={s.message === s.label ? undefined : s.message}
              style={{
                appearance: 'none',
                background: '#fff',
                border: '1.5px solid rgba(0,74,173,0.22)',
                borderRadius: 10,
                padding: '8px 12px',
                fontFamily: 'inherit',
                fontWeight: 400,
                fontSize: 13,
                lineHeight: 1.2,
                color: BLUE,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {finished ? (
        <FinishedNotice onReset={reset} />
      ) : (
        <Composer
          draft={draft}
          setDraft={setDraft}
          pending={pending}
          inputRef={inputRef}
          onSubmit={() => submit()}
        />
      )}
    </div>
  );
}

function Header({ onClose, onReset }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 12px 14px 16px',
        background: `linear-gradient(180deg, ${BLUE} 0%, ${DEEP} 160%)`,
        flexShrink: 0,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: 'rgba(255,255,255,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 15, color: '#fff', lineHeight: 1.2 }}>
          InsureMyNation Assistant
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>
          Answers from our website
        </div>
      </div>

      {onReset && (
        <button
          type="button"
          className="imn-chat-iconbtn"
          onClick={onReset}
          aria-label="Start a new chat, clearing this conversation"
          title="New chat"
          style={{
            appearance: 'none',
            border: 0,
            background: 'none',
            borderRadius: 8,
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2M18 3v4h-4M6 21v-4h4"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      <button
        type="button"
        className="imn-chat-iconbtn"
        onClick={onClose}
        aria-label="Close chat"
        style={{
          appearance: 'none',
          border: 0,
          background: 'none',
          borderRadius: 8,
          width: 34,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function DayDivider() {
  return (
    <div
      style={{
        alignSelf: 'center',
        fontSize: 12,
        fontWeight: 400,
        color: 'rgba(0,74,173,0.55)',
        padding: '2px 0 4px',
      }}
    >
      Today
    </div>
  );
}

/**
 * A failed turn, shown in place with the backend's own wording.
 *
 * The message matters: the backend distinguishes "too many messages", "chatbot not
 * configured" and an upstream outage, and each tells the visitor something different
 * about whether waiting will help.
 */
function ErrorNotice({ error, onRetry }) {
  const rateLimited = /too many/i.test(error.message);
  // Some messages already carry the number — the orchestrator client's 403/404 text does —
  // and printing it twice in one notice reads as a bug.
  const hasNumber = error.message.includes(PHONE);
  return (
    <div
      role="alert"
      style={{
        alignSelf: 'stretch',
        background: 'rgba(199,42,45,0.06)',
        border: '1px solid rgba(199,42,45,0.22)',
        borderRadius: 12,
        padding: '10px 12px',
        fontSize: 13,
        lineHeight: 1.5,
        color: 'rgb(150,30,33)',
      }}
    >
      <div>{error.message}</div>
      {!rateLimited && !hasNumber && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,30,71,0.7)' }}>
          You can also call {PHONE} or email {EMAIL}.
        </div>
      )}
      {error.retry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            appearance: 'none',
            marginTop: 8,
            border: 0,
            background: 'none',
            padding: 0,
            font: 'inherit',
            fontSize: 13,
            fontWeight: 500,
            color: BLUE,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Replaces the composer once the conversation reaches a terminal state.
 *
 * The composer is removed rather than merely disabled because the session is deleted
 * server-side: sending into it would silently open a *second* conversation, and since that
 * conversation ends in a lead, the sales desk would get the same person twice.
 */
function FinishedNotice({ onReset }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '12px 14px',
        borderTop: '1px solid rgba(0,74,173,0.12)',
        flexShrink: 0,
        background: '#fff',
        fontSize: 13,
        fontWeight: 300,
        color: 'rgba(0,30,71,0.7)',
      }}
    >
      <span>This chat is complete.</span>
      <button
        type="button"
        onClick={onReset}
        style={{
          appearance: 'none',
          border: 0,
          background: 'none',
          padding: 0,
          font: 'inherit',
          fontWeight: 500,
          color: BLUE,
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Start a new chat
      </button>
    </div>
  );
}

function Composer({ draft, setDraft, pending, inputRef, onSubmit }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        padding: '10px 12px 12px',
        borderTop: '1px solid rgba(0,74,173,0.12)',
        flexShrink: 0,
        background: '#fff',
      }}
    >
      <textarea
        ref={inputRef}
        className="imn-chat-input"
        rows={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends; Shift+Enter is a newline, which is what a multi-line
          // question about a policy needs.
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Ask anything..."
        aria-label="Message"
        maxLength={2000}
        style={{
          flex: 1,
          minWidth: 0,
          resize: 'none',
          maxHeight: 96,
          border: 0,
          background: 'transparent',
          padding: '8px 4px',
          fontFamily: 'inherit',
          fontWeight: 300,
          fontSize: 14,
          lineHeight: 1.5,
          color: BLUE,
        }}
      />
      <button
        type="submit"
        className="imn-chat-send"
        disabled={pending || !draft.trim()}
        aria-label="Send message"
        style={{
          appearance: 'none',
          border: 0,
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: BLUE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 12l16-8-6 8 6 8-16-8Z"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
