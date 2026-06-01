const DIRECTIONS_BASE = import.meta.env.DEV
  ? '/api/google/directions'
  : 'https://maps.googleapis.com/maps/api/directions/json'

function formatPoint(stop) {
  return `${stop.lat},${stop.lng}`
}

/** Decode Google's encoded polyline into { lat, lng } points. */
export function decodePolyline(encoded) {
  if (!encoded) {
    return []
  }

  const points = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return points
}

function mergePaths(segments) {
  const merged = []

  for (const segment of segments) {
    if (segment.length === 0) {
      continue
    }
    if (merged.length === 0) {
      merged.push(...segment)
    } else {
      merged.push(...segment.slice(1))
    }
  }

  return merged
}

async function fetchDirectionsLeg(origin, destination, viaStops = []) {
  const params = new URLSearchParams({
    origin: formatPoint(origin),
    destination: formatPoint(destination),
    mode: 'driving',
  })

  if (viaStops.length > 0) {
    params.set('waypoints', viaStops.map(formatPoint).join('|'))
  }

  if (!import.meta.env.DEV) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return { path: [], error: 'VITE_GOOGLE_MAPS_API_KEY is not configured' }
    }
    params.set('key', apiKey)
  }

  const response = await fetch(`${DIRECTIONS_BASE}?${params.toString()}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo consultar la ruta por carretera')
  }

  if (data.status !== 'OK') {
    const message = data.error_message || data.status
    return { path: [], error: message }
  }

  const encoded = data.routes?.[0]?.overview_polyline?.points
  if (!encoded) {
    return { path: [], error: 'La API no devolvió geometría de la ruta' }
  }

  return { path: decodePolyline(encoded), error: null }
}

/**
 * Driving path along roads for the ordered stops (open or closed tour).
 * Returns { path, error } where error is set when falling back is needed.
 */
export async function fetchDrivingPath(routePath, routeMode) {
  if (!routePath || routePath.length < 2) {
    return { path: [], error: null }
  }

  if (routeMode === 'open') {
    const destination = routePath[routePath.length - 1]
    const viaStops = routePath.length > 2 ? routePath.slice(1, -1) : []
    return fetchDirectionsLeg(routePath[0], destination, viaStops)
  }

  if (routePath.length === 2) {
    const outbound = await fetchDirectionsLeg(routePath[0], routePath[1], [])
    if (outbound.error) {
      return outbound
    }
    const inbound = await fetchDirectionsLeg(routePath[1], routePath[0], [])
    if (inbound.error) {
      return { path: outbound.path, error: inbound.error }
    }
    return { path: mergePaths([outbound.path, inbound.path]), error: null }
  }

  return fetchDirectionsLeg(routePath[0], routePath[0], routePath.slice(1))
}
