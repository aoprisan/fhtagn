import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site under /<repo>/. Change this to "/" for a
// user/custom-domain site. The Globe reads import.meta.env.BASE_URL to load its
// bundled atlas, so keep this in sync with where the app is hosted.
const base = '/fhtagn/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    // No backend in the UI-first build — the app runs on the in-browser
    // MockGameClient. When the Go backend lands, restore an /api + /ws proxy here.
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
