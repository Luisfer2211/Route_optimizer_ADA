import { useCallback, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './services/firebase'
import { optimizeRoute } from './services/cloudFunction'
import { validateDestinationsRadius } from './services/roadDistance'
import AuthForm from './components/AuthForm'
import DestinationInput from './components/DestinationInput'
import RouteMap from './components/Map'
import RadiusValidation from './components/RadiusValidation'
import RouteOptions from './components/RouteOptions'
import RouteResult from './components/RouteResult'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [destinations, setDestinations] = useState([])
  const [routeMode, setRouteMode] = useState('closed')
  const [radiusStatus, setRadiusStatus] = useState({
    loading: false,
    valid: false,
    error: '',
  })
  const [calculating, setCalculating] = useState(false)
  const [calculateMessage, setCalculateMessage] = useState(null)
  const [routeResult, setRouteResult] = useState(null)
  const [routeMetrics, setRouteMetrics] = useState(null)

  const handleValidationChange = useCallback((status) => {
    setRadiusStatus(status)
    if (!status.valid) {
      setCalculateMessage(null)
      setRouteResult(null)
      setRouteMetrics(null)
    }
  }, [])

  function handleDestinationsChange(nextDestinations) {
    setDestinations(nextDestinations)
    setRouteResult(null)
    setRouteMetrics(null)
    setCalculateMessage(null)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthReady(true)
    })
    return unsubscribe
  }, [])

  async function handleSignOut() {
    await signOut(auth)
  }

  async function handleCalculate() {
    setCalculateMessage(null)
    setRouteResult(null)
    setRouteMetrics(null)

    if (destinations.length < 2) {
      return
    }

    setCalculating(true)
    try {
      const validation = await validateDestinationsRadius(destinations)
      if (!validation.valid) {
        setCalculateMessage({
          type: 'error',
          text: 'Las paradas no cumplen el límite de 100 km por carretera.',
        })
        return
      }

      const result = await optimizeRoute({
        mode: routeMode,
        destinations: destinations.map(({ id, name, address, lat, lng }) => ({
          id,
          name,
          address,
          lat,
          lng,
        })),
      })

      setRouteResult(result)
      setCalculateMessage({
        type: 'info',
        text: 'Ruta calculada correctamente.',
      })
    } catch (err) {
      setCalculateMessage({
        type: 'error',
        text: err.message || 'No se pudo calcular la ruta.',
      })
    } finally {
      setCalculating(false)
    }
  }

  if (!authReady) {
    return (
      <div className="app-shell">
        <p className="loading-text">Cargando…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app-shell">
        <AuthForm />
      </div>
    )
  }

  return (
    <div className="app-shell app-layout">
      <header className="app-header">
        <div className="app-brand">
          <img src="/logo.svg" alt="" className="app-brand__logo" width={44} height={44} />
          <div>
            <h1>Optimizador de rutas</h1>
            <p className="user-email">{user.email}</p>
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={handleSignOut}>
          Cerrar sesión
        </button>
      </header>

      <main className="app-main">
        <DestinationInput
          destinations={destinations}
          onChange={handleDestinationsChange}
        />
        <RadiusValidation
          destinations={destinations}
          onValidationChange={handleValidationChange}
        />
        <RouteOptions
          routeMode={routeMode}
          onRouteModeChange={setRouteMode}
          destinations={destinations}
          radiusStatus={radiusStatus}
          onCalculate={handleCalculate}
          calculating={calculating}
          calculateMessage={calculateMessage}
        />
        <RouteResult result={routeResult} metrics={routeMetrics} />
        <RouteMap
          destinations={destinations}
          routePath={routeResult?.destinations}
          routeMode={routeResult?.mode ?? routeMode}
          totalDistanceKm={routeResult?.totalDistanceKm ?? 0}
          onRouteMetrics={setRouteMetrics}
        />
      </main>
    </div>
  )
}

export default App
