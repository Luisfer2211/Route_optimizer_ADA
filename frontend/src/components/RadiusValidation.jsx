import {
  MAX_RADIUS_KM,
  validateDestinationsRadius,
} from '../utils/distance'

export default function RadiusValidation({ destinations }) {
  if (destinations.length < 2) {
    return null
  }

  const { valid, maxDistanceKm, violatingPair } =
    validateDestinationsRadius(destinations)

  if (valid) {
    return (
      <div className="radius-banner radius-banner--ok" role="status">
        Distancias válidas: la parada más lejana está a{' '}
        <strong>{maxDistanceKm.toFixed(1)} km</strong> (máximo {MAX_RADIUS_KM}{' '}
        km).
      </div>
    )
  }

  return (
    <div className="radius-banner radius-banner--error" role="alert">
      <strong>No se puede calcular la ruta:</strong>{' '}
      {violatingPair.from.name} y {violatingPair.to.name} están a{' '}
      {violatingPair.distanceKm.toFixed(1)} km. Todas las paradas deben estar a
      como máximo {MAX_RADIUS_KM} km entre sí.
    </div>
  )
}
