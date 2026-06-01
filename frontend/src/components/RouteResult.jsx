export default function RouteResult({ result }) {
  if (!result) {
    return null
  }

  const modeLabel = result.mode === 'closed' ? 'cerrada' : 'abierta'

  return (
    <section className="route-result-panel">
      <h2>Ruta optimizada</h2>
      <p>
        Modo <strong>{modeLabel}</strong> — distancia total por carretera:{' '}
        <strong>{result.totalDistanceKm.toFixed(1)} km</strong>
      </p>
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
