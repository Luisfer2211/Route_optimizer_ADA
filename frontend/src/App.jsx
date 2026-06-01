import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './services/firebase'
import AuthForm from './components/AuthForm'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

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
    <div className="app-shell">
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
        <p className="placeholder">
          Sesión activa. Aquí irán los destinos, el mapa y el cálculo de la ruta.
        </p>
      </main>
    </div>
  )
}

export default App
