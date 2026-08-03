import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useDocumentTitle } from '../useDocumentTitle'
import { PasswordInput } from './PasswordInput'
import './AuthForm.css'

export function Login() {
  useDocumentTitle('Вход')
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

  async function handleOAuth(provider) {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/' },
    })
    if (oauthError) setError(oauthError.message)
  }

  return (
    <div className="auth-shell">
      <h2 className="auth-title">Вход</h2>

      <form onSubmit={handleSubmit}>
        <button type="button" className="oauth-btn" onClick={() => handleOAuth('google')}>
          <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.43.36-2.09V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.85Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53Z"/></svg>
          Продължи с Google
        </button>
        <button type="button" className="oauth-btn" onClick={() => handleOAuth('linkedin_oidc')}>
          <svg viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z"/></svg>
          Продължи с LinkedIn
        </button>
        <div className="oauth-divider">или</div>

        <div className="auth-field">
          <label>Имейл</label>
          <input type="email" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="auth-field">
          <label>Парола</label>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
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