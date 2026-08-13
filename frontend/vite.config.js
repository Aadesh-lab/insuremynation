import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The chat widget calls {baseUrl}/v1/*, and baseUrl is the page's own origin.
    // Proxying to the Go backend keeps it same-origin in dev too, so local work
    // never depends on the deployed service or on CORS.
    proxy: {
      '/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
