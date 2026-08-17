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

function ChatGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
