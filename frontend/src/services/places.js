const placesUrl = import.meta.env.VITE_LAB_PLACES_URL

export function normalizePlace(rawPlace) {
  return {
    name: rawPlace.displayName?.text ?? 'Sin nombre',
    address: rawPlace.formattedAddress ?? '',
    lat: rawPlace.location?.latitude,
    lng: rawPlace.location?.longitude,
  }
}

export async function searchPlaces(query) {
  if (!placesUrl) {
    throw new Error('VITE_LAB_PLACES_URL no está configurada')
  }

  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const url = new URL(placesUrl)
  url.searchParams.set('place', trimmed)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Error al buscar lugares (${response.status})`)
  }

  const data = await response.json()
  return (data.places ?? []).map(normalizePlace)
}
