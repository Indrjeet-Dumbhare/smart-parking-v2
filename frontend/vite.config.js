import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the Vite server forwards API and socket traffic to the backend,
// so the frontend can always use relative URLs like /api/slots.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
