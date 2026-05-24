import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: [".ngrok-free.dev", ".trycloudflare.com"],
    hmr: {
      path: 'vite-hmr',
    },
    proxy: {
      // Proxy everything that is NOT a Vite internal path, the HMR path, or the root
      '^/(?!(vite-hmr|@vite|src|node_modules|@react-refresh|index.html|favicon.ico|$)).*': {
        target: 'http://127.0.0.1:2567',
        ws: true,
        changeOrigin: true,
        bypass: (req) => {
          // If it's the root, an HTML request, or an internal Vite path, do NOT proxy
          if (req.url === '/' || req.url === '/index.html' || req.headers.accept?.includes('text/html')) {
            return req.url;
          }
        }
      }
    }
  }
});
