import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BLUE, DEEP, EMAIL, PHONE } from '../../data/site';
import { isContactAsk } from './contactAsk';
import ContactForm from './ContactForm';
import Message from './Message';

export default function ChatPanel({ chat, onClose }) {
  const { messages, pending, error, send, clearError, reset, chips, finished } = chat;
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  /**
   * Sizes and positions the bottom sheet on a phone, against the *visual* viewport.
   *
   * Below 560px the panel is a sheet anchored to the bottom (see chat.css), deliberately
   * short of full height so the page stays visible above it and the chat reads as an overlay
   * on the site rather than a separate app.
   *
   * Two things CSS cannot do here. `bottom: 0` is the *layout* viewport, which an on-screen
   * keyboard does not shrink — so the sheet, and the composer with it, would sit underneath
   * the keyboard exactly when it is being typed into; `dvh` does not help, it tracks browser
   * chrome, not keyboards. And the sheet has to give up its margin when the keyboard takes
   * the space it was leaving to the page.
   *
   * A real keyboard cannot be emulated headlessly, so `scratchpad/mobile.mjs` exercises the
   * resize path by shrinking the whole viewport, which is a smaller phone rather than a
   * keyboard. The keyboard branch itself is reasoned, not measured.
   *
   * Nothing is set on desktop, where the panel is a fixed card and the inline styles fit.
   */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const SHEET = 0.85; // of the viewport, with the keyboard down

    const apply = () => {
      const el = panelRef.current;
      if (!el) return;
      const h = vv.height;
      // A keyboard shrinks the visual viewport and leaves the layout viewport alone, so the
      // gap between the two is the signal — no need to remember a previous height, which
      // would be wrong for anyone who opens the chat with the keyboard already up. Once the
      // keyboard is there is no room to spare, so the sheet takes what is left rather than
      // keep showing page behind it.
      const keyboardUp = h < window.innerHeight * 0.8;
      // Custom properties, not `style.height` / `style.bottom`. Those two are set inline by
      // the component to the design's desktop card, and writing them here — or removing them
      // again above 560px — destroys that card, which is how the desktop panel ended up with
      // no anchor and off-screen. chat.css consumes these only inside the phone breakpoint,
      // so on desktop they sit unused.
      el.style.setProperty('--imn-sheet-h', `${Math.round(keyboardUp ? h : h * SHEET)}px`);
      // How far the visual viewport's bottom sits above the layout viewport's — zero until a
      // keyboard or a browser toolbar takes space.
      el.style.setProperty(
        '--imn-sheet-bottom',
        `${Math.max(0, Math.round(window.innerHeight - h - vv.offsetTop))}px`
      );
    };

    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    window.addEventListener('orientationchange', apply);
    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      window.removeEventListener('orientationchange', apply);
    };
  }, []);

  // Focus the composer on open, but not on a touch screen: focusing there summons the
  // keyboard over half the panel before the visitor has read the question, and the chips
  // are the answer most of them want anyway.
  useEffect(() => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      inputRef.current?.focus();
    }
  }, []);

  /**
   * Whether the assistant is currently asking for contact details, in which case the visitor
   * gets a form rather than a bare keyboard. Keyed on the last assistant reply, so a refresh
   * mid-question brings the form back with the restored transcript, and the "Thanks, Utsav!"
   * that follows dismisses it.
   *
   * Declared above the scroll effect because that effect lists it as a dependency, and a
   * dependency array is evaluated during render.
   */
  const last = messages[messages.length - 1];
  const askingContact =
    !finished && !chips && last?.role === 'assistant' && !last.streaming && isContactAsk(last.text);

  // Pin to the newest content. Layout effect so the jump happens before paint
  // rather than as a visible scroll on every streamed token.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending, error, askingContact]);

  const submit = (text) => {
    const value = (text ?? draft).trim();
    if (!value || pending) return;
    setDraft('');
    send(value);
  };

  return (
    <div
      ref={panelRef}
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

        {/* No locally rendered greeting: the opening message is a real message, and it
            arrives from `init`. */}
        {messages.map((m) => (
          <Message key={m.id} role={m.role} text={m.text} streaming={m.streaming} />
        ))}

        {error && <ErrorNotice error={error} onRetry={() => { clearError(); submit(error.retry); }} />}

        {/* Inside the scroll area, unlike the chips, because it is tall. Pinned below the
            transcript it would be clipped by the panel's overflow on a short screen — and
            with nothing scrollable under the visitor's finger the gesture falls through to
            the page behind, which reads as a form that cannot be scrolled. Here it scrolls
            with the conversation, and the auto-scroll below brings it into view. */}
        {askingContact && !error && (
          <ContactForm disabled={pending} onSubmit={(text) => submit(text)} />
        )}
      </div>

      {/* Hidden when the assistant has not offered a choice, and while an error is
          showing so the retry link is the only thing to click. Never the *only* way to
          answer: the composer stays available so a visitor can type "we are four in
          Gurgaon" instead of picking from the list. */}
      {chips && !error && (
        <div
          className="imn-chat-chips"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            padding: '4px 16px 12px',
          }}
        >
          {chips.map((label) => (
            <button
              key={label}
              type="button"
              className="imn-chat-chip"
              disabled={pending}
              // The label *is* the message — no aria-label, because it would only repeat
              // the visible text.
              onClick={() => submit(label)}
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
              {label}
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
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
            stroke={BLUE}
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
      className="imn-chat-finished"
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
      className="imn-chat-composer"
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
            // Apex on the right, wing tips on the left. The previous path had it the other
            // way round, which drew the plane pointing back at the transcript.
            d="M20 12 4 4l6 8-6 8 16-8Z"
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
