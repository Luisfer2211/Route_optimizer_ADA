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

/** Largest pairwise distance among destinations (0 if fewer than 2). */
export function maxPairwiseDistanceKm(destinations) {
  let max = 0
  for (let i = 0; i < destinations.length; i += 1) {
    for (let j = i + 1; j < destinations.length; j += 1) {
      const km = distanceKm(destinations[i], destinations[j])
      if (km > max) {
        max = km
      }
    }
  }
  return max
}

/**
 * All stops must lie within 100 km of each other (max pairwise distance).
 */
export function validateDestinationsRadius(destinations, maxKm = MAX_RADIUS_KM) {
  if (destinations.length < 2) {
    return { valid: true, maxDistanceKm: 0, violatingPair: null }
  }

  let maxDistanceKm = 0
  let violatingPair = null

  for (let i = 0; i < destinations.length; i += 1) {
    for (let j = i + 1; j < destinations.length; j += 1) {
      const km = distanceKm(destinations[i], destinations[j])
      if (km > maxDistanceKm) {
        maxDistanceKm = km
        violatingPair = {
          from: destinations[i],
          to: destinations[j],
          distanceKm: km,
        }
      }
    }
  }

  const valid = maxDistanceKm <= maxKm
  return {
    valid,
    maxDistanceKm,
    violatingPair: valid ? null : violatingPair,
  }
}

/** Check if adding `candidate` keeps all pairs within maxKm. */
export function canAddDestination(candidate, existing, maxKm = MAX_RADIUS_KM) {
  if (existing.length === 0) {
    return { allowed: true }
  }

  for (const stop of existing) {
    const km = distanceKm(candidate, stop)
    if (km > maxKm) {
      return {
        allowed: false,
        distanceKm: km,
        from: stop,
        to: candidate,
      }
    }
  }

  return { allowed: true }
}
