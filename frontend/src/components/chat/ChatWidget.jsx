import { useCallback, useEffect, useRef, useState } from 'react';
import { BLUE, DEEP } from '../../data/site';
import { useHeadlessChat } from './useHeadlessChat';
import ChatPanel from './ChatPanel';
import './chat.css';

/**
 * The assistant launcher and panel.
 *
 * Replaces the hosted imagine.bo widget script, which could not render this design — no
 * suggested replies, no date divider, no per-message avatar — and flattened every failure
 * to "Something went wrong", so a visitor could not tell a misconfiguration from a dropped
 * connection.
 *
 * Which page the visitor is on still decides where the funnel opens, but that is not this
 * component's business any more: useHeadlessChat reads the page context itself when it
 * starts a conversation. See pageContext.js.
 */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const chat = useHeadlessChat();
  const launcherRef = useRef(null);

  const openPanel = useCallback(() => {
    setOpen(true);
    chat.init();
  }, [chat]);

  const closePanel = useCallback(() => {
    setOpen(false);
    // Return focus to the launcher so keyboard users are not dropped at the top of
    // the document.
    launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closePanel]);

  /**
   * Locks the page behind the sheet while it is open, on phones only.
   *
   * The sheet covers most of the screen but not all of it, and a drag that starts outside the
   * transcript — on the header, the composer, the dimmed strip — otherwise scrolls the site
   * underneath. The chat appears to be stuck while the page slides away behind it.
   *
   * Desktop keeps its scroll: there the panel is a small card and the page around it is still
   * the thing being read.
   */
  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 560px)').matches) return undefined;
    document.body.classList.add('imn-chat-locked');
    return () => document.body.classList.remove('imn-chat-locked');
  }, [open]);

  return (
    <>
      {open && (
        <>
          {/* Visible only on a phone, where the panel is a sheet over the page: it dims what
              is behind and gives the visitor somewhere to tap to dismiss. `display` is left
              to chat.css so the media query decides — setting it inline would beat the
              stylesheet and put a dimmer over the desktop page too. */}
          <div
            className="imn-chat-backdrop"
            onClick={closePanel}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2147482999,
              background: 'rgba(0,13,40,0.45)',
            }}
          />
          <ChatPanel chat={chat} onClose={closePanel} />
        </>
      )}

      {/* `--open` is what hides this on a phone. The panel goes full-screen below 560px, and
          the launcher is fixed to the same corner at the same z-index but painted after it,
          so it sits on top of the send button. On desktop it stays put and becomes the
          close control. */}
      <button
        ref={launcherRef}
        type="button"
        className={open ? 'imn-chat-launcher imn-chat-launcher--open' : 'imn-chat-launcher'}
        onClick={() => (open ? closePanel() : openPanel())}
        aria-label={open ? 'Close chat' : 'Chat with the InsureMyNation Assistant'}
        aria-expanded={open}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: 2147483000,
          width: 60,
          height: 60,
          borderRadius: '50%',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(180deg, ${BLUE} 0%, ${DEEP} 140%)`,
          boxShadow: '0 10px 28px rgba(0,30,71,0.28)',
        }}
      >
        {open ? <CloseGlyph /> : <ChatGlyph />}
      </button>
    </>
  );
}

/* The robot from the design handoff's chatbot.svg (repo root), filled white. The launcher is
   the assistant's logo, so it gets the robot; the chat bubble stays inside the panel. */
function ChatGlyph() {
  return (
    <svg width="32" height="32" viewBox="0 0 100 100" fill="#fff" aria-hidden="true">
      <path d="m87.019 45.176-3.686-1.842c0-18.412-14.925-33.334-33.333-33.334-18.41 0-33.334 14.922-33.334 33.334l-3.684 1.842c-1.64.82-2.982 2.992-2.982 4.824v6.667c0 1.832 1.342 4.004 2.982 4.824l3.684 1.842h5v-19.999c0-15.625 12.711-28.334 28.334-28.334 15.622 0 28.333 12.709 28.333 28.334v26.666c0 8.284-6.715 15-15 15h-10v-5h-6.667v10h16.667c11.045 0 20-8.955 20-20v-6.667l3.686-1.842c1.64-.82 2.981-2.992 2.981-4.824v-6.667c0-1.832-1.341-4.004-2.981-4.824z" />
      <path d="m63.333 35h-10.833v-7.084c1.966-.67 3.333-2.09 3.333-3.75 0-2.301-2.61-4.166-5.833-4.166s-5.834 1.865-5.834 4.166c0 1.66 1.367 3.084 3.334 3.75v7.084h-10.834c-5.52 0-10 4.479-10 10v13.333c0 9.199 7.469 16.667 16.668 16.667h13.333c9.199 0 16.666-7.468 16.666-16.667v-13.333c0-5.521-4.479-10-10-10zm-24.999 16.667v-3.333c0-1.844 1.494-3.334 3.332-3.334 1.84 0 3.334 1.49 3.334 3.334v3.333c0 1.846-1.494 3.333-3.334 3.333-1.838 0-3.332-1.487-3.332-3.333zm19.999 13.333-6.666 1.667h-3.333l-6.668-1.667v-3.333h16.667zm3.334-13.333c0 1.846-1.494 3.333-3.334 3.333-1.839 0-3.333-1.487-3.333-3.333v-3.333c0-1.844 1.494-3.334 3.333-3.334 1.84 0 3.334 1.49 3.334 3.334z" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
