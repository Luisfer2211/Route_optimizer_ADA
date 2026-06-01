export const MAX_RADIUS_KM = 100
const EARTH_RADIUS_KM = 6371

/** Great-circle distance in kilometers (Haversine). */
export function distanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/** Distance from `point` to its nearest other destination. */
export function closestNeighborDistanceKm(point, destinations) {
  let min = Infinity
  let closest = null

  for (const other of destinations) {
    if (other === point) {
      continue
    }
    const km = distanceKm(point, other)
    if (km < min) {
      min = km
      closest = other
    }
  }

  return { distanceKm: min, closest }
}

/**
 * Each stop must be within maxKm of its closest neighbor (not every other stop).
 */
export function validateDestinationsRadius(destinations, maxKm = MAX_RADIUS_KM) {
  if (destinations.length < 2) {
    return { valid: true, maxClosestKm: 0, violatingStop: null }
  }

  let maxClosestKm = 0
  let violatingStop = null

  for (const stop of destinations) {
    const { distanceKm: closestKm, closest } = closestNeighborDistanceKm(
      stop,
      destinations,
    )
    if (closestKm > maxClosestKm) {
      maxClosestKm = closestKm
    }
    if (closestKm > maxKm) {
      return {
        valid: false,
        maxClosestKm,
        violatingStop: {
          stop,
          closest,
          distanceKm: closestKm,
        },
      }
    }
  }

  return { valid: true, maxClosestKm, violatingStop: null }
}

/** New stop must be within maxKm of at least one existing stop (its nearest). */
export function canAddDestination(candidate, existing, maxKm = MAX_RADIUS_KM) {
  if (existing.length === 0) {
    return { allowed: true }
  }

  const { distanceKm: closestKm, closest } = closestNeighborDistanceKm(
    candidate,
    existing,
  )

  if (closestKm > maxKm) {
    return {
      allowed: false,
      distanceKm: closestKm,
      from: closest,
      to: candidate,
    }
  }

  return { allowed: true }
}
