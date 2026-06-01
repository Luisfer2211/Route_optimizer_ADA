import { auth } from './firebase'

/**
 * Calls the route optimizer Cloud Function with the Firebase ID token.
 * Implementation will be completed when the backend is deployed.
 */
export async function optimizeRoute(payload) {
  const baseUrl = import.meta.env.VITE_ROUTE_OPTIMIZER_URL
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
    const message = await response.text()
    throw new Error(message || `Request failed (${response.status})`)
  }

  return response.json()
}
