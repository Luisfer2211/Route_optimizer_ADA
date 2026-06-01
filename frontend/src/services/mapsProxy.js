import { auth } from './firebase'

function getOptimizerBaseUrl() {
  const baseUrl = import.meta.env.VITE_ROUTE_OPTIMIZER_URL?.trim()
  if (!baseUrl) {
    throw new Error('VITE_ROUTE_OPTIMIZER_URL is not configured')
  }
  return baseUrl.replace(/\/$/, '')
}

async function getAuthHeaders(proxyService, extraHeaders = {}) {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User must be signed in')
  }

  const idToken = await user.getIdToken()
  return {
    ...extraHeaders,
    Authorization: `Bearer ${idToken}`,
    'X-Maps-Proxy': proxyService,
  }
}

/**
 * Call Maps REST APIs through the Cloud Function (avoids browser CORS in production).
 * @param {'distance-matrix'|'directions'|'places-search'} proxyService
 */
export async function fetchMapsProxy(proxyService, path, options = {}) {
  const url = `${getOptimizerBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const headers = await getAuthHeaders(proxyService, options.headers ?? {})

  return fetch(url, {
    ...options,
    headers,
  })
}
