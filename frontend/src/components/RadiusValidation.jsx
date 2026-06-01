import { useEffect, useState } from 'react'
import {
  MAX_RADIUS_KM,
  validateDestinationsRadius,
} from '../services/roadDistance'

export default function RadiusValidation({ destinations, onValidationChange }) {
  const [state, setState] = useState({
    loading: false,
    error: '',
    result: null,
  })

  useEffect(() => {
    if (destinations.length < 2) {
      const empty = { loading: false, error: '', result: null }
      setState(empty)
      onValidationChange?.({
        loading: false,
        valid: false,
        error: '',
      })
      return undefined
    }

    let cancelled = false
    const loadingState = { loading: true, error: '', result: null }
    setState(loadingState)
    onValidationChange?.({ loading: true, valid: false, error: '' })

    validateDestinationsRadius(destinations)
      .then((result) => {
        if (!cancelled) {
          setState({ loading: false, error: '', result })
          onValidationChange?.({
            loading: false,
            valid: result.valid,
            error: '',
          })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err.message || 'Error al validar distancias'
          setState({
            loading: false,
            error: message,
            result: null,
          })
          onValidationChange?.({
            loading: false,
            valid: false,
            error: message,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [destinations, onValidationChange])

  if (destinations.length < 2) {
    return null
  }

  if (state.loading || !state.result) {
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

  const { valid, maxClosestKm, violatingStop } = state.result

  if (valid) {
    return (
      <div className="radius-banner radius-banner--ok" role="status">
        Distancias por carretera válidas: la vecina más lejana está a{' '}
        <strong>{Number(maxClosestKm).toFixed(1)} km</strong> (máximo {MAX_RADIUS_KM}{' '}
        km).
      </div>
    )
  }

  if (!violatingStop) {
    return (
      <div className="radius-banner radius-banner--error" role="alert">
        Las paradas no cumplen el límite de {MAX_RADIUS_KM} km por carretera.
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
