function getPlacesSearchBaseUrl() {
  // In dev, Vite proxies /api/lab/places → lab Cloud Function (no CORS in browser).
  if (import.meta.env.DEV) {
    return '/api/lab/places'
  }
  return import.meta.env.VITE_LAB_PLACES_URL
}

export function normalizePlace(rawPlace) {
  return {
    name: rawPlace.displayName?.text ?? 'Sin nombre',
    address: rawPlace.formattedAddress ?? '',
    lat: rawPlace.location?.latitude,
    lng: rawPlace.location?.longitude,
  }
}

export async function searchPlaces(query) {
  const baseUrl = getPlacesSearchBaseUrl()
  if (!baseUrl) {
    throw new Error('VITE_LAB_PLACES_URL no está configurada')
  }

  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const url = new URL(baseUrl, import.meta.env.DEV ? window.location.origin : undefined)
  url.searchParams.set('place', trimmed)

  const response = await fetch(url.toString())
  if (!response.ok) {
    let detail = ''
    try {
      const errBody = await response.json()
      detail = errBody.error ? `: ${errBody.error}` : ''
    } catch {
      /* ignore */
    }
    throw new Error(`Error al buscar lugares (${response.status})${detail}`)
  }

  const data = await response.json()
  return (data.places ?? []).map(normalizePlace)
}
