import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '../services/firebase'

function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/email-already-in-use':
      return 'Ese correo ya está registrado. Inicia sesión.'
    case 'auth/invalid-email':
      return 'Correo no válido.'
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.'
    default:
      return 'No se pudo completar la operación. Intenta de nuevo.'
  }
}

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(mode) {
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email.trim(), password)
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <img src="/logo.svg" alt="" className="auth-brand__logo" width={56} height={56} />
        <h1>Optimizador de rutas</h1>
      </div>
      <p className="auth-subtitle">Inicia sesión para continuar</p>

      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmit('signin')
        }}
      >
        <label htmlFor="email">Correo</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
        />

        {error ? <p className="auth-error">{error}</p> : null}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Cargando…' : 'Iniciar sesión'}
        </button>

        <button
          type="button"
          className="btn-secondary"
          disabled={loading}
          onClick={() => handleSubmit('signup')}
        >
          Crear cuenta
        </button>
      </form>
    </div>
  )
}
