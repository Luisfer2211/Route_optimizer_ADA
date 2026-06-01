/** Format seconds as a human-readable driving time (Spanish). */
export function formatDrivingDuration(totalSeconds) {
  if (totalSeconds == null || totalSeconds <= 0) {
    return null
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.ceil((totalSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours} h ${minutes} min`
  }

  if (minutes <= 1) {
    return '1 min'
  }

  return `${minutes} min`
}

/** Fallback when Directions duration is unavailable (≈50 km/h average). */
export function estimateDrivingSecondsFromDistanceKm(distanceKm, averageKmh = 50) {
  if (!distanceKm || distanceKm <= 0) {
    return 0
  }
  return Math.round((distanceKm / averageKmh) * 3600)
}
