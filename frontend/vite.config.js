import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const labPlacesUrl =
  process.env.VITE_LAB_PLACES_URL ??
  'https://us-central1-lab-ada-mapas.cloudfunctions.net/maps-query'

/** Dev-only proxy: Vite's rewrite was dropping query params (place=). */
function labPlacesDevProxy() {
  return {
    name: 'lab-places-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/lab/places')) {
          return next()
        }

        const incoming = new URL(req.url, 'http://localhost')
        const upstream = new URL(labPlacesUrl)
        incoming.searchParams.forEach((value, key) => {
          upstream.searchParams.set(key, value)
        })

        try {
          const response = await fetch(upstream.toString())
          const body = await response.text()
          res.statusCode = response.status
          res.setHeader(
            'Content-Type',
            response.headers.get('content-type') ?? 'application/json',
          )
          res.end(body)
        } catch {
          res.statusCode = 502
          res.end(JSON.stringify({ error: 'No se pudo contactar el servicio del lab' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), labPlacesDevProxy()],
})
