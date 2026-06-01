import { auth } from './firebase'

function getOptimizerBaseUrl() {
  const baseUrl = import.meta.env.VITE_ROUTE_OPTIMIZER_URL?.trim()
  if (!baseUrl) {
    throw new Error('VITE_ROUTE_OPTIMIZER_URL is not configured')
  }
  return baseUrl.replace(/\/$/, '')
}

async function getAuthHeaders(extraHeaders = {}) {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User must be signed in')
  }

  const idToken = await user.getIdToken()
  return {
    ...extraHeaders,
    Authorization: `Bearer ${idToken}`,
  }
}

function appendProxyQuery(path, proxyService) {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}mapsProxy=${encodeURIComponent(proxyService)}`
}

/**
 * Call Maps REST APIs through the Cloud Function (avoids browser CORS in production).
 * Uses ?mapsProxy= query param so preflight does not require a custom header.
 * @param {'distance-matrix'|'directions'|'places-search'} proxyService
 */
export async function fetchMapsProxy(proxyService, path, options = {}) {
  const pathWithProxy = appendProxyQuery(
    path.startsWith('/') ? path : `/${path}`,
    proxyService,
  )
  const url = `${getOptimizerBaseUrl()}${pathWithProxy}`
  const headers = await getAuthHeaders(options.headers ?? {})

  return fetch(url, {
    ...options,
    headers,
  })
}
