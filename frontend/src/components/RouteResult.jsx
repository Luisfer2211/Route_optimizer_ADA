import {
  estimateDrivingSecondsFromDistanceKm,
  formatDrivingDuration,
} from '../utils/formatDuration'

function resolveTotalSeconds(metrics, distanceKm) {
  if (metrics?.fromDirections && metrics.totalDurationSeconds > 0) {
    return metrics.totalDurationSeconds
  }
  if (metrics?.estimatedFromDistanceKm) {
    return estimateDrivingSecondsFromDistanceKm(metrics.estimatedFromDistanceKm)
  }
  return estimateDrivingSecondsFromDistanceKm(distanceKm)
}

export default function RouteResult({ result, metrics }) {
  if (!result) {
    return null
  }

  const modeLabel = result.mode === 'closed' ? 'cerrada' : 'abierta'
  const startNote =
    result.fixStart === false
      ? 'Inicio y fin elegidos por el optimizador.'
      : 'Inicio fijo: primer destino ingresado.'
  const totalSeconds = resolveTotalSeconds(metrics, result.totalDistanceKm)
  const totalTimeLabel = formatDrivingDuration(totalSeconds)
  const outboundTimeLabel = formatDrivingDuration(metrics?.outboundDurationSeconds)
  const returnTimeLabel = formatDrivingDuration(metrics?.returnDurationSeconds)
  const timeSource = metrics?.fromDirections
    ? 'Google Maps (tiempo de conducción estimado)'
    : 'estimado (~50 km/h)'

  return (
    <section className="route-result-panel">
      <h2>Ruta optimizada</h2>
      <p className="route-result-summary">
        Modo <strong>{modeLabel}</strong> — distancia total por carretera:{' '}
        <strong>{result.totalDistanceKm.toFixed(1)} km</strong>
        {totalTimeLabel ? (
          <>
            {' '}
            — tiempo estimado: <strong>{totalTimeLabel}</strong>
          </>
        ) : null}
      </p>
      <p className="route-result-time-note">{timeSource}</p>
      <p className="route-result-time-note">{startNote}</p>
      {result.mode === 'closed' && metrics?.fromDirections && outboundTimeLabel ? (
        <p className="route-result-legs-time">
          Ida: <strong>{outboundTimeLabel}</strong>
          {returnTimeLabel ? (
            <>
              {' '}
              · Regreso: <strong>{returnTimeLabel}</strong>
            </>
          ) : null}
        </p>
      ) : null}
      <ol className="route-result-list">
        {result.destinations.map((stop, index) => (
          <li key={stop.id || `${stop.lat}-${stop.lng}-${index}`}>
            <span className="destination-index">{index + 1}</span>
            <span>{stop.name}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
