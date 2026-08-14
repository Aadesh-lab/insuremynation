import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BLUE, DEEP } from '../../data/site';
import { productForPage } from './journeys';
import { useChat } from './useChat';
import ChatPanel from './ChatPanel';
import './chat.css';

/**
 * The assistant launcher and panel.
 *
 * Replaces the hosted imagine.bo widget script. That script could not render this
 * design — it has no suggested replies, no date divider and no per-message avatar —
 * and it discarded the backend's error bodies, so a rate limit reached the visitor
 * as "Something went wrong". Owning the UI fixes both and costs no backend change:
 * every call it makes is to the existing `/v1/*` proxy.
 */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  // Ads run per product line, so the page a visitor lands on already says which cover
  // they came for. It opens that product's funnel instead of asking again.
  const { pathname, search } = useLocation();
  const chat = useChat(productForPage(pathname, search));
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

  return (
    <>
      {open && <ChatPanel chat={chat} onClose={closePanel} />}

      <button
        ref={launcherRef}
        type="button"
        className="imn-chat-launcher"
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
