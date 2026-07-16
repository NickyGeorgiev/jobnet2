import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './AuthForm.css'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="auth-shell">
        <h2 className="auth-title">Проверете имейла си</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Изпратихме линк за смяна на паролата на <strong style={{ color: 'var(--color-text)' }}>{email}</strong>.
        </p>
        <p className="auth-footer-link" style={{ marginTop: 0 }}>
          <Link to="/login">Обратно към вход</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <h2 className="auth-title">Забравена парола</h2>

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label>Имейл</label>
          <input type="email" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Изпращам...' : 'Изпрати линк за смяна'}
        </button>
      </form>

      <p className="auth-footer-link">
        <Link to="/login">Обратно към вход</Link>
      </p>
    </div>
  )
}