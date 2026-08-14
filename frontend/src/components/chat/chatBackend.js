import { useChat } from './useChat';
import { useHeadlessChat } from './useHeadlessChat';

/**
 * Which assistant the panel talks to.
 *
 *   'orchestrator' — imagine.bo's headless API, called direct from the browser. It owns the
 *                    funnel, the prompt and the lead capture (name + mobile once at the end,
 *                    into their CRM). See HEADLESS_CHAT_INTEGRATION.md and useHeadlessChat.js.
 *   'proxy'        — our own Go service at /v1/*, with the funnel in journeys.js and the
 *                    prompt in backend/internal/services/chat.go. No lead capture at all.
 *
 * A module constant on purpose. It has to be fixed for the lifetime of the page so that
 * `useActiveChat` calls the same hook on every render — a value that could change at
 * runtime would reorder hooks and crash React. Flipping it is a one-line commit, which is
 * what a deploy is anyway, so there is nothing to gain from build-arg plumbing
 * (`import.meta.env` is used nowhere else in this tree).
 *
 * Roll back by setting this to 'proxy'. Both paths are kept working until the orchestrator
 * one is confirmed live on production traffic; after that the proxy chat code goes.
 */
export const CHAT_BACKEND = 'orchestrator';

/**
 * Both hooks return the same shape —
 * `{ messages, pending, error, send, init, reset, clearError, greeting, chips, finished }`
 * — so ChatPanel renders either without knowing which is live.
 *
 * `product` is only used by the proxy path, which resolves its funnel from the route. The
 * orchestrator gets the page context in its own `init` payload instead.
 */
export function useActiveChat(product) {
  return CHAT_BACKEND === 'orchestrator' ? useHeadlessChat() : useChat(product);
}
