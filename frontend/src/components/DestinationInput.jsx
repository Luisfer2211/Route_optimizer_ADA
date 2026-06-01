import { useState } from 'react'
import { searchPlaces } from '../services/places'
import { canAddDestination, MAX_RADIUS_KM } from '../services/roadDistance'

const MAX_DESTINATIONS = 15
const MIN_DESTINATIONS = 2

function createDestinationId() {
  return crypto.randomUUID()
}

export default function DestinationInput({ destinations, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [checkingDistance, setCheckingDistance] = useState(false)
  const [error, setError] = useState('')

  const atMax = destinations.length >= MAX_DESTINATIONS

  async function handleSearch(event) {
    event.preventDefault()
    setError('')
    setResults([])

    if (!query.trim()) {
      setError('Escribe un lugar para buscar.')
      return
    }

    setLoading(true)
    try {
      const places = await searchPlaces(query)
      setResults(places)
      if (places.length === 0) {
        setError('No se encontraron resultados.')
      }
    } catch (err) {
      setError(err.message || 'No se pudo buscar el lugar.')
    } finally {
      setLoading(false)
    }
  }

  async function addDestination(place) {
    if (atMax) {
      setError(`Máximo ${MAX_DESTINATIONS} destinos.`)
      return
    }

    const duplicate = destinations.some(
      (item) =>
        item.lat === place.lat &&
        item.lng === place.lng &&
        item.name === place.name,
    )
    if (duplicate) {
      setError('Ese destino ya está en la lista.')
      return
    }

    if (place.lat == null || place.lng == null) {
      setError('El lugar no tiene coordenadas válidas.')
      return
    }

    setCheckingDistance(true)
    setError('')
    try {
      const radiusCheck = await canAddDestination(place, destinations)
      if (!radiusCheck.allowed) {
        setError(
          `Por carretera, la parada más cercana a "${place.name}" es "${radiusCheck.from.name}" (${radiusCheck.distanceKm.toFixed(1)} km). Máximo: ${MAX_RADIUS_KM} km.`,
        )
        return
      }

      onChange([
        ...destinations,
        { id: createDestinationId(), ...place },
      ])
      setResults([])
      setQuery('')
    } catch (err) {
      setError(err.message || 'No se pudo validar la distancia por carretera.')
    } finally {
      setCheckingDistance(false)
    }
  }

  function removeDestination(id) {
    onChange(destinations.filter((item) => item.id !== id))
    setError('')
  }

  return (
    <section className="destinations-panel">
      <h2>Destinos</h2>
      <p className="destinations-hint">
        Agrega entre {MIN_DESTINATIONS} y {MAX_DESTINATIONS} paradas ({destinations.length}/
        {MAX_DESTINATIONS}). Cada una debe tener otra parada a ≤ {MAX_RADIUS_KM}{' '}
        km por carretera (Google Distance Matrix).
      </p>

      <form className="search-form" onSubmit={handleSearch}>
        <label htmlFor="place-query">Buscar lugar</label>
        <div className="search-row">
          <input
            id="place-query"
            type="text"
            placeholder="Ej. Estadio Mario Camposeco, Quetzaltenango"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={atMax || loading || checkingDistance}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={atMax || loading || checkingDistance}
          >
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </form>

      {error ? <p className="destinations-error">{error}</p> : null}

      {results.length > 0 ? (
        <ul className="search-results">
          {results.map((place) => (
            <li key={`${place.name}-${place.lat}-${place.lng}`}>
              <div>
                <strong>{place.name}</strong>
                <span>{place.address}</span>
              </div>
              <button
                type="button"
                className="btn-secondary btn-small"
                disabled={atMax || checkingDistance}
                onClick={() => addDestination(place)}
              >
                {checkingDistance ? 'Validando…' : 'Agregar'}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {destinations.length > 0 ? (
        <ol className="destination-list">
          {destinations.map((item, index) => (
            <li key={item.id}>
              <span className="destination-index">{index + 1}</span>
              <div className="destination-info">
                <strong>{item.name}</strong>
                <span>{item.address}</span>
              </div>
              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={() => removeDestination(item.id)}
                aria-label={`Quitar destino ${index + 1}`}
              >
                Quitar
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="destinations-empty">Aún no hay destinos en la ruta.</p>
      )}
    </section>
  )
}
