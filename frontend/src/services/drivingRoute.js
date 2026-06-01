import { fetchMapsProxy } from './mapsProxy'

/** @typedef {'outbound' | 'return' | 'full'} RouteLegRole */

/**
 * @typedef {Object} RoutePathSegment
 * @property {{ lat: number, lng: number }[]} path
 * @property {RouteLegRole} role
 * @property {number} [durationSeconds]
 */

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

function pathFromDirectionsLeg(leg) {
  const detailed = []

  for (const step of leg.steps ?? []) {
    const encoded = step.polyline?.points
    if (!encoded) {
      continue
    }
    const segment = decodePolyline(encoded)
    if (segment.length === 0) {
      continue
    }
    if (detailed.length === 0) {
      detailed.push(...segment)
    } else {
      detailed.push(...segment.slice(1))
    }
  }

  return detailed
}

function legDurationSeconds(leg) {
  return leg.duration?.value ?? 0
}

function sumDurations(durations) {
  return durations.reduce((total, seconds) => total + seconds, 0)
}

/**
 * Full-resolution path from each driving step (curves along roads).
 * overview_polyline is simplified and looks like straight chords when zoomed in.
 */
function pathFromDirectionsRoute(route) {
  const legPaths = (route.legs ?? []).map((leg) => pathFromDirectionsLeg(leg))
  const merged = mergePaths(legPaths)
  if (merged.length >= 2) {
    return merged
  }

  const overview = route.overview_polyline?.points
  return overview ? decodePolyline(overview) : []
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

  const response = import.meta.env.DEV
    ? await fetch(`/api/google/directions?${params.toString()}`)
    : await fetchMapsProxy('directions', `/directions?${params.toString()}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo consultar la ruta por carretera')
  }

  if (data.status !== 'OK') {
    const message = data.error_message || data.status
    return {
      path: [],
      legs: [],
      legDurations: [],
      totalDurationSeconds: 0,
      error: message,
    }
  }

  const route = data.routes?.[0]
  if (!route) {
    return {
      path: [],
      legs: [],
      legDurations: [],
      totalDurationSeconds: 0,
      error: 'La API no devolvió geometría de la ruta',
    }
  }

  const routeLegs = route.legs ?? []
  const legs = routeLegs.map((leg) => pathFromDirectionsLeg(leg))
  const legDurations = routeLegs.map((leg) => legDurationSeconds(leg))
  const path = mergePaths(legs)
  if (path.length < 2) {
    return {
      path: [],
      legs: [],
      legDurations: [],
      totalDurationSeconds: 0,
      error: 'La API no devolvió geometría de la ruta',
    }
  }

  return {
    path,
    legs,
    legDurations,
    totalDurationSeconds: sumDurations(legDurations),
    error: null,
  }
}

function buildStraightSegments(routePath, routeMode, distanceKm = 0) {
  if (routeMode === 'open') {
    const path = routePath.map((stop) => ({ lat: stop.lat, lng: stop.lng }))
    return {
      segments: [{ path, role: 'full', durationSeconds: 0 }],
      path,
      totalDurationSeconds: 0,
      error: null,
      estimatedFromDistanceKm: distanceKm,
    }
  }

  const outboundStops = routePath.map((stop) => ({ lat: stop.lat, lng: stop.lng }))
  const returnPath = [
    outboundStops[outboundStops.length - 1],
    { lat: routePath[0].lat, lng: routePath[0].lng },
  ]

  return {
    segments: [
      { path: outboundStops, role: 'outbound', durationSeconds: 0 },
      { path: returnPath, role: 'return', durationSeconds: 0 },
    ],
    path: [...outboundStops, ...returnPath.slice(1)],
    totalDurationSeconds: 0,
    error: null,
    estimatedFromDistanceKm: distanceKm,
  }
}

/**
 * Driving path along roads for the ordered stops (open or closed tour).
 * @returns {{ segments: RoutePathSegment[], path: {lat:number,lng:number}[], error: string|null }}
 */
export async function fetchDrivingPath(routePath, routeMode) {
  if (!routePath || routePath.length < 2) {
    return { segments: [], path: [], totalDurationSeconds: 0, error: null }
  }

  if (routeMode === 'open') {
    const destination = routePath[routePath.length - 1]
    const viaStops = routePath.length > 2 ? routePath.slice(1, -1) : []
    const result = await fetchDirectionsLeg(routePath[0], destination, viaStops)
    return {
      segments: result.path.length
        ? [{ path: result.path, role: 'full', durationSeconds: result.totalDurationSeconds }]
        : [],
      path: result.path,
      totalDurationSeconds: result.totalDurationSeconds,
      error: result.error,
    }
  }

  if (routePath.length === 2) {
    const outbound = await fetchDirectionsLeg(routePath[0], routePath[1], [])
    if (outbound.error) {
      return {
        segments: [],
        path: [],
        totalDurationSeconds: 0,
        error: outbound.error,
      }
    }
    const inbound = await fetchDirectionsLeg(routePath[1], routePath[0], [])
    const segments = [
      {
        path: outbound.path,
        role: 'outbound',
        durationSeconds: outbound.totalDurationSeconds,
      },
    ]
    if (inbound.path.length >= 2) {
      segments.push({
        path: inbound.path,
        role: 'return',
        durationSeconds: inbound.totalDurationSeconds,
      })
    }
    return {
      segments,
      path: mergePaths([outbound.path, inbound.path]),
      totalDurationSeconds: outbound.totalDurationSeconds + inbound.totalDurationSeconds,
      error: inbound.error,
    }
  }

  const result = await fetchDirectionsLeg(routePath[0], routePath[0], routePath.slice(1))
  if (result.error || result.legs.length === 0) {
    return {
      segments: [],
      path: result.path,
      totalDurationSeconds: 0,
      error: result.error,
    }
  }

  if (result.legs.length === 1) {
    return {
      segments: [
        {
          path: result.path,
          role: 'outbound',
          durationSeconds: result.totalDurationSeconds,
        },
      ],
      path: result.path,
      totalDurationSeconds: result.totalDurationSeconds,
      error: result.error,
    }
  }

  const outboundPath = mergePaths(result.legs.slice(0, -1))
  const returnPath = result.legs[result.legs.length - 1]
  const outboundDuration = sumDurations(result.legDurations.slice(0, -1))
  const returnDuration = result.legDurations[result.legDurations.length - 1] ?? 0

  return {
    segments: [
      { path: outboundPath, role: 'outbound', durationSeconds: outboundDuration },
      { path: returnPath, role: 'return', durationSeconds: returnDuration },
    ],
    path: result.path,
    totalDurationSeconds: result.totalDurationSeconds,
    error: result.error,
  }
}

export { buildStraightSegments }
