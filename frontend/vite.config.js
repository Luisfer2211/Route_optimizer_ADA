import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const labPlacesTarget =
  process.env.VITE_LAB_PLACES_URL ??
  'https://us-central1-lab-ada-mapas.cloudfunctions.net/maps-query'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Avoid browser CORS: lab Cloud Function is called from the dev server, not the browser.
      '/api/lab/places': {
        target: new URL(labPlacesTarget).origin,
        changeOrigin: true,
        rewrite: () => new URL(labPlacesTarget).pathname,
      },
    },
  },
})
