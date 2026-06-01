const MIN_DESTINATIONS = 2

export default function RouteOptions({
  routeMode,
  fixStart,
  onRouteModeChange,
  destinations,
  radiusStatus,
  onCalculate,
  calculating,
  calculateMessage,
}) {
  const hasEnoughStops = destinations.length >= MIN_DESTINATIONS
  const radiusReady =
    !radiusStatus.loading && radiusStatus.valid && !radiusStatus.error
  const canCalculate = hasEnoughStops && radiusReady && !calculating

  let disabledReason = ''
  if (!hasEnoughStops) {
    disabledReason = `Agrega al menos ${MIN_DESTINATIONS} destinos.`
  } else if (radiusStatus.loading) {
    disabledReason = 'Espera la validación de distancias.'
  } else if (radiusStatus.error) {
    disabledReason = radiusStatus.error
  } else if (!radiusStatus.valid) {
    disabledReason = 'Corrige las distancias entre paradas antes de calcular.'
  }

  return (
    <section className="route-options-panel">
      <h2>Modo de ruta</h2>

      <fieldset className="route-mode-fieldset">
        <legend className="sr-only">Tipo de recorrido</legend>

        <label className="route-mode-option">
          <input
            type="radio"
            name="route-mode"
            value="closed"
            checked={routeMode === 'closed'}
            onChange={() => onRouteModeChange('closed')}
          />
          <span>
            <strong>Ruta cerrada</strong>
            <small>
              {fixStart
                ? 'Empieza en el primer destino ingresado y regresa a ese punto.'
                : 'Recorre todos los destinos y regresa al punto de inicio elegido por el optimizador.'}
            </small>
          </span>
        </label>

        <label className="route-mode-option">
          <input
            type="radio"
            name="route-mode"
            value="open"
            checked={routeMode === 'open'}
            onChange={() => onRouteModeChange('open')}
          />
          <span>
            <strong>Ruta abierta</strong>
            <small>
              {fixStart
                ? 'Empieza en el primer destino ingresado; termina en el último de la ruta optimizada.'
                : 'El optimizador elige inicio y fin para minimizar la distancia total.'}
            </small>
          </span>
        </label>
      </fieldset>

      <button
        type="button"
        className="btn-primary btn-calculate"
        disabled={!canCalculate}
        onClick={onCalculate}
      >
        {calculating ? 'Calculando…' : 'Calcular ruta óptima'}
      </button>

      {!canCalculate && disabledReason ? (
        <p className="route-options-hint">{disabledReason}</p>
      ) : null}

      {calculateMessage ? (
        <p
          className={
            calculateMessage.type === 'error'
              ? 'route-options-message route-options-message--error'
              : 'route-options-message'
          }
          role={calculateMessage.type === 'error' ? 'alert' : 'status'}
        >
          {calculateMessage.text}
        </p>
      ) : null}
    </section>
  )
}
