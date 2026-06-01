import { useCallback, useEffect, useMemo, useRef } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'

const DEFAULT_CENTER = { lat: 19.4326, lng: -99.1332 }
const MAP_CONTAINER_STYLE = { width: '100%', height: 'min(420px, 55vh)', borderRadius: '12px' }

function fitMapToDestinations(map, destinations) {
  if (!map || destinations.length === 0) {
    return
  }

  if (destinations.length === 1) {
    map.setCenter({ lat: destinations[0].lat, lng: destinations[0].lng })
    map.setZoom(14)
    return
  }

  const bounds = new window.google.maps.LatLngBounds()
  destinations.forEach((destination) => {
    bounds.extend({ lat: destination.lat, lng: destination.lng })
  })
  map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 })
}

export default function RouteMap({ destinations }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const mapRef = useRef(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey ?? '',
  })

  const center = useMemo(() => {
    if (destinations.length === 0) {
      return DEFAULT_CENTER
    }
    return { lat: destinations[0].lat, lng: destinations[0].lng }
  }, [destinations])

  const onMapLoad = useCallback(
    (map) => {
      mapRef.current = map
      fitMapToDestinations(map, destinations)
    },
    [destinations],
  )

  useEffect(() => {
    fitMapToDestinations(mapRef.current, destinations)
  }, [destinations])

  if (!apiKey) {
    return (
      <section className="map-panel map-panel--muted">
        <h2>Mapa</h2>
        <p>
          Agrega <code>VITE_GOOGLE_MAPS_API_KEY</code> en <code>frontend/.env</code> y
          habilita Maps JavaScript API en Google Cloud.
        </p>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="map-panel map-panel--muted">
        <h2>Mapa</h2>
        <p>No se pudo cargar Google Maps. Revisa la API key y las restricciones.</p>
      </section>
    )
  }

  if (!isLoaded) {
    return (
      <section className="map-panel map-panel--muted">
        <h2>Mapa</h2>
        <p>Cargando mapa…</p>
      </section>
    )
  }

  return (
    <section className="map-panel">
      <h2>Mapa</h2>
      {destinations.length === 0 ? (
        <p className="map-empty-hint">Agrega destinos para ver los pines en el mapa.</p>
      ) : null}
      <div className="map-frame">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={destinations.length === 0 ? 11 : 12}
          onLoad={onMapLoad}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {destinations.map((destination, index) => (
            <Marker
              key={destination.id}
              position={{ lat: destination.lat, lng: destination.lng }}
              label={{
                text: String(index + 1),
                color: '#ffffff',
                fontWeight: '700',
              }}
              title={destination.name}
            />
          ))}
        </GoogleMap>
      </div>
    </section>
  )
}
