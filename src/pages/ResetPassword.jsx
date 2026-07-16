import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './AuthForm.css'

export function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Паролите не съвпадат')
      return
    }
    if (password.length < 6) {
      setError('Паролата трябва да е поне 6 символа')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    navigate('/')
  }

  return (
    <div className="auth-shell">
      <h2 className="auth-title">Нова парола</h2>

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label>Нова парола</label>
          <input type="password" className="auth-input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>

        <div className="auth-field">
          <label>Повтори паролата</label>
          <input type="password" className="auth-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Запазвам...' : 'Запази новата парола'}
        </button>
      </form>
    </div>
  )
}