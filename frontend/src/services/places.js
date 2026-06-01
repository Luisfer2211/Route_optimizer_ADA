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

function normalizeGoogleTextSearchResult(result) {
  return {
    name: result.name ?? 'Sin nombre',
    address: result.formatted_address ?? '',
    lat: result.geometry?.location?.lat,
    lng: result.geometry?.location?.lng,
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
  const data = await response.json()

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
  const url = new URL(
    '/api/google/places/textsearch',
    import.meta.env.DEV ? window.location.origin : undefined,
  )
  url.searchParams.set('query', query)

  const response = await fetch(url.toString())
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error ?? `Google Places (${response.status})`)
  }

  const status = data.status
  if (status !== 'OK' && status !== 'ZERO_RESULTS') {
    throw new Error(
      data.error_message ??
        `Google Places: ${status}. Habilita Places API en tu key.`,
    )
  }

  return (data.results ?? []).map(normalizeGoogleTextSearchResult)
}

/**
 * Search places: lab Cloud Function first, then Google Places Text Search (fallback).
 */
export async function searchPlaces(query) {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  try {
    const fromLab = await searchPlacesLab(trimmed)
    if (fromLab.length > 0) {
      return fromLab
    }
  } catch {
    /* lab unavailable — use Google fallback below */
  }

  return searchPlacesGoogle(trimmed)
}
