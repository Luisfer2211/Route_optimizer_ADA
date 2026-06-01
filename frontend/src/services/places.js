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
  const response = await fetch(
    import.meta.env.DEV
      ? '/api/google/places/search'
      : 'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: import.meta.env.DEV
        ? { 'Content-Type': 'application/json' }
        : {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
            'X-Goog-FieldMask':
              'places.displayName,places.formattedAddress,places.location',
          },
      body: JSON.stringify({ textQuery: query }),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    const detail =
      data?.error?.message ?? data?.error ?? `Google Places (${response.status})`
    throw new Error(
      `${detail}. Habilita "Places API (New)" en Google Cloud.`,
    )
  }

  return (data.places ?? []).map(normalizePlace)
}

/**
 * Search places: lab Cloud Function first, then Places API (New) fallback.
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
