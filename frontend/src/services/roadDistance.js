import { fetchMapsProxy } from './mapsProxy'

export const MAX_RADIUS_KM = 100

function formatPoint(point) {
  return `${point.lat},${point.lng}`
}

function parseMatrixResponse(data, originCount, destinationCount) {
  if (data.status !== 'OK') {
    throw new Error(data.error_message || `Distance Matrix: ${data.status}`)
  }

  const matrix = Array.from({ length: originCount }, () =>
    Array.from({ length: destinationCount }, () => null),
  )

  for (let i = 0; i < originCount; i += 1) {
    const row = data.rows[i]
    if (!row) {
      continue
    }
    for (let j = 0; j < destinationCount; j += 1) {
      const element = row.elements[j]
      if (element?.status === 'OK' && element.distance?.value != null) {
        matrix[i][j] = element.distance.value / 1000
      }
    }
  }

  return matrix
}

async function parseJsonResponse(response, fallbackMessage) {
  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(fallbackMessage)
  }

  if (!response.ok) {
    throw new Error(data.error || data.error_message || fallbackMessage)
  }

  return data
}

/** Driving distances (km) via Google Distance Matrix API. */
export async function fetchDrivingDistanceMatrix(origins, destinations) {
  if (origins.length === 0 || destinations.length === 0) {
    return []
  }

  const params = new URLSearchParams({
    origins: origins.map(formatPoint).join('|'),
    destinations: destinations.map(formatPoint).join('|'),
    mode: 'driving',
  })

  const query = params.toString()
  const response = import.meta.env.VITE_ROUTE_OPTIMIZER_URL?.trim()
    ? await fetchMapsProxy('distance-matrix', `/distance-matrix?${query}`)
    : await fetch(`/api/google/distancematrix?${query}`)

  const data = await parseJsonResponse(
    response,
    'No se pudo consultar distancias por carretera',
  )

  return parseMatrixResponse(data, origins.length, destinations.length)
}

export async function closestDrivingNeighbor(point, others) {
  if (others.length === 0) {
    return { distanceKm: 0, closest: null }
  }

  const matrix = await fetchDrivingDistanceMatrix([point], others)
  const row = matrix[0] ?? []

  let minKm = Infinity
  let closest = null

  for (let j = 0; j < others.length; j += 1) {
    const km = row[j]
    if (km != null && km < minKm) {
      minKm = km
      closest = others[j]
    }
  }

  if (!Number.isFinite(minKm)) {
    throw new Error('No se pudo calcular la distancia por carretera')
  }

  return { distanceKm: minKm, closest }
}

/**
 * Each stop must be within maxKm driving distance of its closest neighbor.
 */
export async function validateDestinationsRadius(
  destinations,
  maxKm = MAX_RADIUS_KM,
) {
  if (destinations.length < 2) {
    return { valid: true, maxClosestKm: 0, violatingStop: null }
  }

  const matrix = await fetchDrivingDistanceMatrix(destinations, destinations)
  let maxClosestKm = 0

  for (let i = 0; i < destinations.length; i += 1) {
    let closestKm = Infinity
    let closest = null

    for (let j = 0; j < destinations.length; j += 1) {
      if (i === j) {
        continue
      }
      const km = matrix[i][j]
      if (km == null) {
        throw new Error(
          `Sin ruta por carretera entre ${destinations[i].name} y ${destinations[j].name}`,
        )
      }
      if (km < closestKm) {
        closestKm = km
        closest = destinations[j]
      }
    }

    if (closestKm > maxClosestKm) {
      maxClosestKm = closestKm
    }

    if (closestKm > maxKm) {
      return {
        valid: false,
        maxClosestKm,
        violatingStop: {
          stop: destinations[i],
          closest,
          distanceKm: closestKm,
        },
      }
    }
  }

  return { valid: true, maxClosestKm, violatingStop: null }
}

export async function canAddDestination(candidate, existing, maxKm = MAX_RADIUS_KM) {
  if (existing.length === 0) {
    return { allowed: true }
  }

  const { distanceKm, closest } = await closestDrivingNeighbor(candidate, existing)

  if (distanceKm > maxKm) {
    return {
      allowed: false,
      distanceKm,
      from: closest,
      to: candidate,
    }
  }

  return { allowed: true }
}
