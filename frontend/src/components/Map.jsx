import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { fetchDrivingPath } from '../services/drivingRoute'

const DEFAULT_CENTER = { lat: 19.4326, lng: -99.1332 }
const MAP_CONTAINER_STYLE = { width: '100%', height: 'min(420px, 55vh)', borderRadius: '12px' }

const ROUTE_POLYLINE_OPTIONS = {
  strokeColor: '#2563eb',
  strokeOpacity: 0.9,
  strokeWeight: 4,
}

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

function fitMapToPath(map, path) {
  if (!map || path.length === 0) {
    return
  }

  if (path.length === 1) {
    map.setCenter(path[0])
    map.setZoom(14)
    return
  }

  const bounds = new window.google.maps.LatLngBounds()
  path.forEach((point) => bounds.extend(point))
  map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 })
}

function drawStraightPolyline(map, routePath, routeMode, polylineRef) {
  if (polylineRef.current) {
    polylineRef.current.setMap(null)
    polylineRef.current = null
  }

  const path = routePath.map((stop) => ({ lat: stop.lat, lng: stop.lng }))
  if (routeMode === 'closed' && routePath.length > 1) {
    path.push({ lat: routePath[0].lat, lng: routePath[0].lng })
  }

  polylineRef.current = new window.google.maps.Polyline({
    path,
    geodesic: true,
    ...ROUTE_POLYLINE_OPTIONS,
  })
  polylineRef.current.setMap(map)
}

function drawRoadPolyline(map, path, polylineRef) {
  if (polylineRef.current) {
    polylineRef.current.setMap(null)
    polylineRef.current = null
  }

  polylineRef.current = new window.google.maps.Polyline({
    path,
    geodesic: false,
    ...ROUTE_POLYLINE_OPTIONS,
  })
  polylineRef.current.setMap(map)
}

export default function RouteMap({ destinations, routePath = null, routeMode = 'closed' }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const mapRef = useRef(null)
  const polylineRef = useRef(null)
  const [routeLineWarning, setRouteLineWarning] = useState(null)
  const displayStops = routePath?.length ? routePath : destinations

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey ?? '',
  })

  const center = useMemo(() => {
    if (displayStops.length === 0) {
      return DEFAULT_CENTER
    }
    return { lat: displayStops[0].lat, lng: displayStops[0].lng }
  }, [displayStops])

  const onMapLoad = useCallback(
    (map) => {
      mapRef.current = map
      fitMapToDestinations(map, displayStops)
    },
    [displayStops],
  )

  useEffect(() => {
    fitMapToDestinations(mapRef.current, displayStops)
  }, [displayStops])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.google?.maps) {
      return undefined
    }

    const clearPolyline = () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null)
        polylineRef.current = null
      }
    }

    if (!routePath || routePath.length < 2) {
      clearPolyline()
      setRouteLineWarning(null)
      return undefined
    }

    let cancelled = false
    setRouteLineWarning(null)

    ;(async () => {
      try {
        const { path, error } = await fetchDrivingPath(routePath, routeMode)
        if (cancelled) {
          return
        }

        if (path.length >= 2) {
          drawRoadPolyline(map, path, polylineRef)
          fitMapToPath(map, path)
          if (error) {
            setRouteLineWarning(
              `Ruta parcial por carretera. ${error}. Habilita Directions API en Google Cloud.`,
            )
          }
          return
        }

        drawStraightPolyline(map, routePath, routeMode, polylineRef)
        fitMapToDestinations(map, routePath)
        const hint =
          error ||
          'No se pudo trazar la ruta por carretera. Habilita Directions API en el mismo proyecto que tu API key.'
        setRouteLineWarning(hint)
      } catch (fetchError) {
        if (cancelled) {
          return
        }
        drawStraightPolyline(map, routePath, routeMode, polylineRef)
        fitMapToDestinations(map, routePath)
        setRouteLineWarning(
          fetchError instanceof Error
            ? fetchError.message
            : 'No se pudo trazar la ruta por carretera.',
        )
      }
    })()

    return () => {
      cancelled = true
      clearPolyline()
    }
  }, [routePath, routeMode])

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
      {displayStops.length === 0 ? (
        <p className="map-empty-hint">Agrega destinos para ver los pines en el mapa.</p>
      ) : null}
      {routeLineWarning ? (
        <p className="map-route-warning" role="status">
          {routeLineWarning}
        </p>
      ) : null}
      <div className="map-frame">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={displayStops.length === 0 ? 11 : 12}
          onLoad={onMapLoad}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {displayStops.map((destination, index) => (
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
