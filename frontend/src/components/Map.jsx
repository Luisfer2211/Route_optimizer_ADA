import { useCallback, useEffect, useMemo, useRef } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'

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

function buildDirectionsRequest(routePath, routeMode) {
  const origin = { lat: routePath[0].lat, lng: routePath[0].lng }

  if (routeMode === 'closed') {
    return {
      origin,
      destination: origin,
      waypoints: routePath.slice(1).map((stop) => ({
        location: { lat: stop.lat, lng: stop.lng },
        stopover: true,
      })),
      travelMode: window.google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false,
    }
  }

  const last = routePath[routePath.length - 1]
  return {
    origin,
    destination: { lat: last.lat, lng: last.lng },
    waypoints:
      routePath.length > 2
        ? routePath.slice(1, -1).map((stop) => ({
            location: { lat: stop.lat, lng: stop.lng },
            stopover: true,
          }))
        : [],
    travelMode: window.google.maps.TravelMode.DRIVING,
    optimizeWaypoints: false,
  }
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

export default function RouteMap({ destinations, routePath = null, routeMode = 'closed' }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const mapRef = useRef(null)
  const polylineRef = useRef(null)
  const directionsRendererRef = useRef(null)
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

    const clearRouteOverlay = () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null)
      }
      if (polylineRef.current) {
        polylineRef.current.setMap(null)
        polylineRef.current = null
      }
    }

    if (!routePath || routePath.length < 2) {
      clearRouteOverlay()
      return undefined
    }

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: false,
        polylineOptions: ROUTE_POLYLINE_OPTIONS,
      })
    }

    const directionsService = new window.google.maps.DirectionsService()
    directionsRendererRef.current.setMap(map)

    let cancelled = false
    const request = buildDirectionsRequest(routePath, routeMode)

    directionsService.route(request, (result, status) => {
      if (cancelled) {
        return
      }

      if (status === window.google.maps.DirectionsStatus.OK && result) {
        if (polylineRef.current) {
          polylineRef.current.setMap(null)
          polylineRef.current = null
        }
        directionsRendererRef.current.setDirections(result)
        const bounds = result.routes?.[0]?.bounds
        if (bounds) {
          map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 })
        }
        return
      }

      directionsRendererRef.current.setMap(null)
      drawStraightPolyline(map, routePath, routeMode, polylineRef)
    })

    return () => {
      cancelled = true
      clearRouteOverlay()
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
