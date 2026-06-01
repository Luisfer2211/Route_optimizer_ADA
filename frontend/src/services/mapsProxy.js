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

/**
 * Call Maps REST APIs through the Cloud Function (avoids browser CORS in production).
 */
export async function fetchMapsProxy(path, options = {}) {
  const url = `${getOptimizerBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const headers = await getAuthHeaders(options.headers ?? {})

  return fetch(url, {
    ...options,
    headers,
  })
}
