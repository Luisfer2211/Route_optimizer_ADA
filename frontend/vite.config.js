import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const labPlacesUrl =
  process.env.VITE_LAB_PLACES_URL ??
  'https://us-central1-lab-ada-mapas.cloudfunctions.net/maps-query'

function attachLabPlacesProxy(server) {
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
}

function attachPlacesNewSearchProxy(server, apiKey) {
  server.middlewares.use(async (req, res, next) => {
    if (req.url !== '/api/google/places/search' || req.method !== 'POST') {
      return next()
    }

    if (!apiKey) {
      res.statusCode = 503
      res.end(
        JSON.stringify({
          error: 'Configura VITE_GOOGLE_MAPS_API_KEY en frontend/.env',
        }),
      )
      return
    }

    try {
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const requestBody = Buffer.concat(chunks)

      const response = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'places.displayName,places.formattedAddress,places.location',
          },
          body: requestBody,
        },
      )

      const body = await response.text()
      res.statusCode = response.status
      res.setHeader(
        'Content-Type',
        response.headers.get('content-type') ?? 'application/json',
      )
      res.end(body)
    } catch {
      res.statusCode = 502
      res.end(JSON.stringify({ error: 'No se pudo contactar Places API (New)' }))
    }
  })
}

function attachDistanceMatrixProxy(server, apiKey) {
  server.middlewares.use(async (req, res, next) => {
    if (!req.url?.startsWith('/api/google/distancematrix')) {
      return next()
    }

    if (!apiKey) {
      res.statusCode = 503
      res.end(
        JSON.stringify({
          error: 'Configura VITE_GOOGLE_MAPS_API_KEY en frontend/.env',
        }),
      )
      return
    }

    const incoming = new URL(req.url, 'http://localhost')
    const upstream = new URL(
      'https://maps.googleapis.com/maps/api/distancematrix/json',
    )
    incoming.searchParams.forEach((value, key) => {
      upstream.searchParams.set(key, value)
    })
    upstream.searchParams.set('key', apiKey)
    if (!upstream.searchParams.has('units')) {
      upstream.searchParams.set('units', 'metric')
    }

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
      res.end(JSON.stringify({ error: 'No se pudo contactar Distance Matrix API' }))
    }
  })
}

function attachOptimizerProxy(server) {
  const target =
    process.env.VITE_OPTIMIZER_DEV_URL ?? 'http://127.0.0.1:8787'

  server.middlewares.use(async (req, res, next) => {
    if (req.url !== '/api/optimize' && !req.url?.startsWith('/api/optimize?')) {
      return next()
    }

    try {
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const body = Buffer.concat(chunks)

      const response = await fetch(target, {
        method: req.method,
        headers: {
          'Content-Type': req.headers['content-type'] ?? 'application/json',
          Authorization: req.headers.authorization ?? '',
        },
        body: body.length > 0 ? body : undefined,
      })

      const responseBody = await response.text()
      res.statusCode = response.status
      res.setHeader(
        'Content-Type',
        response.headers.get('content-type') ?? 'application/json',
      )
      res.end(responseBody)
    } catch {
      res.statusCode = 502
      res.end(
        JSON.stringify({
          error:
            'No se pudo contactar la Cloud Function local (cd backend && uv run functions-framework --target=optimize_route --port=8787)',
        }),
      )
    }
  })
}

function devProxies(apiKey) {
  const attach = (server) => {
    attachLabPlacesProxy(server)
    attachPlacesNewSearchProxy(server, apiKey)
    attachDistanceMatrixProxy(server, apiKey)
    attachOptimizerProxy(server)
  }
  return {
    name: 'dev-api-proxies',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), devProxies(env.VITE_GOOGLE_MAPS_API_KEY)],
  }
})
