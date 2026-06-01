function getLabPlacesBaseUrl() {
  if (import.meta.env.DEV) {
    return '/api/lab/places'
  }
  return import.meta.env.VITE_LAB_PLACES_URL
}

export function normalizePlace(rawPlace) {
  return {
    name: rawPlace.displayName?.text ?? rawPlace.name ?? 'Sin nombre',
    address: rawPlace.formattedAddress ?? rawPlace.address ?? '',
    lat: rawPlace.location?.latitude ?? rawPlace.lat,
    lng: rawPlace.location?.longitude ?? rawPlace.lng,
  }
}

async function searchPlacesLab(query) {
  const baseUrl = getLabPlacesBaseUrl()
  if (!baseUrl) {
    throw new Error('VITE_LAB_PLACES_URL no está configurada')
  }

  const url = new URL(baseUrl, import.meta.env.DEV ? window.location.origin : undefined)
  url.searchParams.set('place', query)

  const response = await fetch(url.toString())
  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Lab: respuesta no válida')
  }

  if (!response.ok) {
    const detail = data?.error?.message ?? data?.error ?? response.status
    throw new Error(`Lab: ${detail}`)
  }

  if (data.error) {
    const detail = data.error.message ?? 'servicio del lab no disponible'
    throw new Error(`Lab: ${detail}`)
  }

  return (data.places ?? []).map(normalizePlace)
}

async function searchPlacesGoogle(query) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('VITE_GOOGLE_MAPS_API_KEY is not configured')
  }

  const requestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify({ textQuery: query }),
  }

  const response = import.meta.env.DEV
    ? await fetch('/api/google/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestInit.body,
      })
    : await fetch('https://places.googleapis.com/v1/places:searchText', requestInit)

  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(
      'Google Places devolvió una respuesta no válida. Revisa la API key y Places API (New).',
    )
  }

  if (!response.ok) {
    const detail =
      data?.error?.message ?? data?.error ?? `Google Places (${response.status})`
    throw new Error(
      typeof detail === 'string' ? detail : 'No se pudo buscar el lugar.',
    )
  }

  return (data.places ?? []).map(normalizePlace)
}

/**
 * Search places: lab Cloud Function in local dev only (Vite proxy avoids CORS).
 * Production calls Places API (New) from the browser (referrer-restricted API key).
 */
export async function searchPlaces(query) {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  if (import.meta.env.DEV) {
    try {
      const fromLab = await searchPlacesLab(trimmed)
      if (fromLab.length > 0) {
        return fromLab
      }
    } catch {
      /* lab unavailable — use Google fallback below */
    }
  }

  return searchPlacesGoogle(trimmed)
}
