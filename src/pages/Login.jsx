import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './AuthForm.css'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    navigate('/')
  }

  return (
    <div className="auth-shell">
      <h2 className="auth-title">Вход</h2>

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label>Имейл</label>
          <input type="email" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="auth-field">
          <label>Парола</label>
          <input type="password" className="auth-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Влизам...' : 'Влез'}
        </button>
      </form>

      <p className="auth-footer-link">
        <Link to="/forgot-password">Забравена парола?</Link>
      </p>
      <p className="auth-footer-link">
        Нямаш акаунт? <Link to="/register">Регистрирай се</Link>
      </p>
    </div>
  )
}