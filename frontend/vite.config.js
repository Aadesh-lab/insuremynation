import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // No proxy: the chat talks to orchestrator.imagine.bo cross-origin, and the Go service
    // no longer has an API to forward to. Note that the assistant will not work on this
    // port until imagine.bo allowlists http://localhost:5173 — everything else gets a
    // 403 and the panel says the chat is unavailable.
    port: 5173,
  },
});
