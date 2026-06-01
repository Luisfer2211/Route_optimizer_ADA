import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { buildStraightSegments, fetchDrivingPath } from '../services/drivingRoute'

const DEFAULT_CENTER = { lat: 14.8349, lng: -91.5181 }
const MAP_CONTAINER_STYLE = { width: '100%', height: 'min(420px, 55vh)', borderRadius: '12px' }

const ROUTE_STROKE = {
  outbound: '#16a34a',
  return: '#dc2626',
  full: '#2563eb',
}

const ARROW_REPEAT_PX = '90px'

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

function buildArrowIcons(mapsApi, strokeColor) {
  return [
    {
      icon: {
        path: mapsApi.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 3,
        fillColor: strokeColor,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 1,
      },
      offset: '0',
      repeat: ARROW_REPEAT_PX,
    },
  ]
}

function clearPolylines(polylinesRef) {
  polylinesRef.current.forEach((polyline) => polyline.setMap(null))
  polylinesRef.current = []
}

function drawRouteSegments(map, segments, polylinesRef) {
  clearPolylines(polylinesRef)
  const mapsApi = window.google.maps

  for (const segment of segments) {
    if (!segment.path || segment.path.length < 2) {
      continue
    }

    const strokeColor = ROUTE_STROKE[segment.role] ?? ROUTE_STROKE.full
    const polyline = new mapsApi.Polyline({
      path: segment.path,
      geodesic: false,
      strokeColor,
      strokeOpacity: 0.92,
      strokeWeight: 5,
      icons: buildArrowIcons(mapsApi, strokeColor),
    })
    polyline.setMap(map)
    polylinesRef.current.push(polyline)
  }
}

function buildRouteMetrics(routeData) {
  const { segments, totalDurationSeconds, estimatedFromDistanceKm } = routeData
  const outbound = segments.find((segment) => segment.role === 'outbound')
  const returnLeg = segments.find((segment) => segment.role === 'return')

  return {
    totalDurationSeconds: totalDurationSeconds ?? 0,
    outboundDurationSeconds: outbound?.durationSeconds ?? 0,
    returnDurationSeconds: returnLeg?.durationSeconds ?? 0,
    fromDirections: (totalDurationSeconds ?? 0) > 0,
    estimatedFromDistanceKm: estimatedFromDistanceKm ?? null,
  }
}

export default function RouteMap({
  destinations,
  routePath = null,
  routeMode = 'closed',
  totalDistanceKm = 0,
  onRouteMetrics = null,
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const mapRef = useRef(null)
  const polylinesRef = useRef([])
  const [routeLineWarning, setRouteLineWarning] = useState(null)
  const displayStops = routePath?.length ? routePath : destinations
  const showLegLegend = routePath?.length >= 2 && routeMode === 'closed'

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

    if (!routePath || routePath.length < 2) {
      clearPolylines(polylinesRef)
      setRouteLineWarning(null)
      onRouteMetrics?.(null)
      return undefined
    }

    let cancelled = false
    setRouteLineWarning(null)

    ;(async () => {
      try {
        const routeData = await fetchDrivingPath(routePath, routeMode)
        if (cancelled) {
          return
        }

        const { segments, path, error } = routeData
        const drawable = segments.filter((segment) => segment.path?.length >= 2)
        if (drawable.length > 0) {
          drawRouteSegments(map, drawable, polylinesRef)
          fitMapToPath(map, path.length >= 2 ? path : drawable[0].path)
          onRouteMetrics?.(buildRouteMetrics(routeData))
          if (error) {
            setRouteLineWarning(
              `Ruta parcial por carretera. ${error}. Habilita Directions API en Google Cloud.`,
            )
          }
          return
        }

        const fallback = buildStraightSegments(routePath, routeMode, totalDistanceKm)
        drawRouteSegments(map, fallback.segments, polylinesRef)
        fitMapToPath(map, fallback.path)
        onRouteMetrics?.(buildRouteMetrics(fallback))
        const hint =
          error ||
          'No se pudo trazar la ruta por carretera. Habilita Directions API en el mismo proyecto que tu API key.'
        setRouteLineWarning(hint)
      } catch (fetchError) {
        if (cancelled) {
          return
        }
        const fallback = buildStraightSegments(routePath, routeMode, totalDistanceKm)
        drawRouteSegments(map, fallback.segments, polylinesRef)
        fitMapToPath(map, fallback.path)
        onRouteMetrics?.(buildRouteMetrics(fallback))
        setRouteLineWarning(
          fetchError instanceof Error
            ? fetchError.message
            : 'No se pudo trazar la ruta por carretera.',
        )
      }
    })()

    return () => {
      cancelled = true
      clearPolylines(polylinesRef)
    }
  }, [routePath, routeMode, totalDistanceKm, onRouteMetrics])

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
      {showLegLegend ? (
        <ul className="map-route-legend" aria-label="Leyenda de tramos de ruta">
          <li>
            <span className="map-route-legend__swatch map-route-legend__swatch--outbound" />
            Ida (hasta el último destino)
          </li>
          <li>
            <span className="map-route-legend__swatch map-route-legend__swatch--return" />
            Regreso al origen
          </li>
        </ul>
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
