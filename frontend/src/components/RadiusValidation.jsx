import {
  MAX_RADIUS_KM,
  validateDestinationsRadius,
} from '../utils/distance'

export default function RadiusValidation({ destinations }) {
  if (destinations.length < 2) {
    return null
  }

  const { valid, maxClosestKm, violatingStop } =
    validateDestinationsRadius(destinations)

  if (valid) {
    return (
      <div className="radius-banner radius-banner--ok" role="status">
        Distancias válidas: la parada más cercana más lejana está a{' '}
        <strong>{maxClosestKm.toFixed(1)} km</strong> (máximo {MAX_RADIUS_KM}{' '}
        km a su vecina más próxima).
      </div>
    )
  }

  return (
    <div className="radius-banner radius-banner--error" role="alert">
      <strong>No se puede calcular la ruta:</strong> la parada más cercana a{' '}
      {violatingStop.stop.name} es {violatingStop.closest.name} (
      {violatingStop.distanceKm.toFixed(1)} km). Cada parada debe tener otra a
      como máximo {MAX_RADIUS_KM} km.
    </div>
  )
}
