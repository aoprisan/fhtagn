import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves a project site under /<repo>/. Change this to "/" for a
// user/custom-domain site. The Globe reads import.meta.env.BASE_URL to load its
// bundled atlas, so keep this in sync with where the app is hosted.
const base = '/fhtagn/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // 'prompt': a fresh SW waits until the player applies it — the always-on
      // update button in <PwaPrompts> checks for builds and swaps them in.
      registerType: 'prompt',
      // We own registration via virtual:pwa-register/react in <PwaPrompts>.
      injectRegister: null,
      // public/manifest.webmanifest is hand-authored and authoritative — don't
      // let the plugin generate or inject a competing one.
      manifest: false,
      workbox: {
        // Precache the shell, hashed bundles, icons, and the globe atlas so the
        // whole UI-first build runs offline against the in-browser sim.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest,woff2}'],
        navigateFallback: `${base}index.html`,
        // Never SPA-fallback future backend routes (LiveGameClient).
        navigateFallbackDenylist: [/^\/api\//, /^\/ws\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fhtagn-font-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fhtagn-font-files',
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // No SW in dev — it only complicates the HMR loop.
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    // No backend in the UI-first build — the app runs on the in-browser
    // MockGameClient. When the Go backend lands, restore an /api + /ws proxy here.
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three'
          if (id.includes('/node_modules/react-globe.gl/')) return 'globe'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
