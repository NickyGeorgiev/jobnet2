import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'
import './AuthForm.css'

export function Register() {
  const { refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialRole = searchParams.get('role') === 'company' ? 'company' : 'candidate'
  const [role, setRole] = useState(initialRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const userId = authData.user.id

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: userId, role: role })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    if (role === 'candidate') {
      await supabase.from('candidates').insert({ id: userId, contact_email: email })
    } else {
      await supabase.from('companies').insert({ id: userId, company_name: '' })
    }

    await refreshProfile()
    setLoading(false)
    navigate('/')
  }

  return (
    <div className="auth-shell">
      <h2 className="auth-title">Регистрация</h2>

      <form onSubmit={handleSubmit}>
        <div className="auth-role-picker">
          <label className={`auth-role-option ${role === 'candidate' ? 'auth-role-option--active' : ''}`}>
            <input type="radio" value="candidate" checked={role === 'candidate'} onChange={(e) => setRole(e.target.value)} />
            👤 Кандидат
          </label>
          <label className={`auth-role-option ${role === 'company' ? 'auth-role-option--active' : ''}`}>
            <input type="radio" value="company" checked={role === 'company'} onChange={(e) => setRole(e.target.value)} />
            🏢 Фирма
          </label>
        </div>

        <div className="auth-field">
          <label>Имейл</label>
          <input type="email" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="auth-field">
          <label>Парола</label>
          <input type="password" className="auth-input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Регистрирам...' : 'Регистрирай се'}
        </button>
      </form>

      <p className="auth-footer-link">
        Вече имаш акаунт? <Link to="/login">Влез</Link>
      </p>
    </div>
  )
}