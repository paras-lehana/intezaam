/**
 * Vite build configuration for the web SPA.
 *
 * Responsibility: bundle the React app into dist/ for the server to serve on the same
 * origin. Boundary: the dev proxy only exists so `npm run dev` talks to a local server;
 * production never proxies because web and API share one origin (one container).
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Port the server listens on locally (matches the server's PORT default). */
const LOCAL_API_ORIGIN = 'http://localhost:8080';
/**
 * The framework packages every page needs (react, react-dom, react-router, scheduler);
 * either path separator, so the split is the same on Windows and Linux builds.
 */
const REACT_VENDOR_MODULES =
  /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/;

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Efficiency: React and the router change only on a dependency upgrade, so they get
          // their own long-cached chunk; an app release re-downloads only the app's own code.
          groups: [{ name: 'react-vendor', test: REACT_VENDOR_MODULES }],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': LOCAL_API_ORIGIN,
    },
  },
});
