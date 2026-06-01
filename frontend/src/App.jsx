import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './services/firebase'
import AuthForm from './components/AuthForm'
import DestinationInput from './components/DestinationInput'
import RouteMap from './components/Map'
import RadiusValidation from './components/RadiusValidation'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [destinations, setDestinations] = useState([])

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
        <div>
          <h1>Optimizador de rutas</h1>
          <p className="user-email">{user.email}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={handleSignOut}>
          Cerrar sesión
        </button>
      </header>

      <main className="app-main">
        <DestinationInput
          destinations={destinations}
          onChange={setDestinations}
        />
        <RadiusValidation destinations={destinations} />
        <RouteMap destinations={destinations} />
      </main>
    </div>
  )
}

export default App
