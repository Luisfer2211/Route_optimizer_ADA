import { useEffect, useState } from 'react'
import {
  MAX_RADIUS_KM,
  validateDestinationsRadius,
} from '../services/roadDistance'

export default function RadiusValidation({ destinations }) {
  const [state, setState] = useState({
    loading: false,
    error: '',
    result: null,
  })

  useEffect(() => {
    if (destinations.length < 2) {
      setState({ loading: false, error: '', result: null })
      return undefined
    }

    let cancelled = false
    setState({ loading: true, error: '', result: null })

    validateDestinationsRadius(destinations)
      .then((result) => {
        if (!cancelled) {
          setState({ loading: false, error: '', result })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            loading: false,
            error: err.message || 'Error al validar distancias',
            result: null,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [destinations])

  if (destinations.length < 2) {
    return null
  }

  if (state.loading) {
    return (
      <div className="radius-banner radius-banner--muted" role="status">
        Calculando distancias por carretera…
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="radius-banner radius-banner--error" role="alert">
        {state.error}
      </div>
    )
  }

  const { valid, maxClosestKm, violatingStop } = state.result ?? { valid: true }

  if (valid) {
    return (
      <div className="radius-banner radius-banner--ok" role="status">
        Distancias por carretera válidas: la vecina más lejana está a{' '}
        <strong>{maxClosestKm.toFixed(1)} km</strong> (máximo {MAX_RADIUS_KM} km).
      </div>
    )
  }

  return (
    <div className="radius-banner radius-banner--error" role="alert">
      <strong>No se puede calcular la ruta:</strong> por carretera,{' '}
      {violatingStop.stop.name} tiene a {violatingStop.closest.name} a{' '}
      {violatingStop.distanceKm.toFixed(1)} km. Cada parada debe tener otra a como
      máximo {MAX_RADIUS_KM} km.
    </div>
  )
}
