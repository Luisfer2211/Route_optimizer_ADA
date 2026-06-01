import { auth } from './firebase'

function getOptimizerUrl() {
  if (import.meta.env.VITE_ROUTE_OPTIMIZER_URL) {
    return import.meta.env.VITE_ROUTE_OPTIMIZER_URL
  }
  if (import.meta.env.DEV) {
    return '/api/optimize'
  }
  return ''
}

/**
 * Calls the route optimizer Cloud Function with the Firebase ID token.
 */
export async function optimizeRoute(payload) {
  const baseUrl = getOptimizerUrl()
  if (!baseUrl) {
    throw new Error('VITE_ROUTE_OPTIMIZER_URL is not configured')
  }

  const user = auth.currentUser
  if (!user) {
    throw new Error('User must be signed in')
  }

  const idToken = await user.getIdToken()
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    const text = await response.text()
    try {
      const data = JSON.parse(text)
      message = data.error || message
    } catch {
      if (text) {
        message = text
      }
    }
    throw new Error(message)
  }

  return response.json()
}
