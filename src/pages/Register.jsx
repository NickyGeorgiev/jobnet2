import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'
import { useDocumentTitle } from '../useDocumentTitle'
import { TurnstileWidget } from './TurnstileWidget'
import { PasswordInput } from './PasswordInput'
import { validatePassword } from '../passwordValidation'
import './AuthForm.css'

export function Register() {
  useDocumentTitle('Регистрация')
  const { refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialRole = searchParams.get('role') === 'company' ? 'company' : 'candidate'
  const [role, setRole] = useState(initialRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [registrationSent, setRegistrationSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const passwordErrors = validatePassword(password)
    if (passwordErrors.length > 0) {
      setError('Паролата трябва да съдържа: ' + passwordErrors.join(', '))
      return
    }

    if (password !== confirmPassword) {
      setError('Паролите не съвпадат.')
      return
    }

    if (!termsAccepted) {
      setError('Трябва да приемете Общите условия и Политиката за поверителност, за да продължите.')
      return
    }

    if (!turnstileToken) {
      setError('Моля, потвърдете, че не сте робот.')
      return
    }

    setLoading(true)

    const { data: verifyData } = await supabase.functions.invoke('verify-turnstile', {
      body: { token: turnstileToken },
    })

    if (!verifyData?.success) {
      setError('Проверката не бе успешна, опитайте отново.')
      setLoading(false)
      return
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } }, // подаваме ролята като metadata — trigger-ът я ползва
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setLoading(false)

    if (authData.session) {
      // Ако все пак има активна сесия (напр. email confirm е изключено някъде), продължаваме както преди
      await refreshProfile()
      navigate('/')
    } else {
      // Изисква се потвърждение на имейл — показваме съобщение вместо да пренасочваме
      setRegistrationSent(true)
    }
  }

  if (registrationSent) {
    return (
      <div className="auth-shell">
        <h2 className="auth-title">Проверете имейла си</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Изпратихме линк за потвърждение на <strong style={{ color: 'var(--color-text)' }}>{email}</strong>.
          Моля, кликнете линка, за да активирате акаунта си.
        </p>
      </div>
    )
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
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
            Поне 8 символа, главна и малка буква, цифра и специален символ.
          </p>
        </div>

        <div className="auth-field">
          <label>Повтори паролата</label>
          <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            style={{ marginTop: '0.2rem', accentColor: 'var(--color-teal)', width: '16px', height: '16px', flexShrink: 0 }}
          />
          <span>
            Съгласен съм с{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-teal)' }}>Общите условия</a>,{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-teal)' }}>Политиката за поверителност</a>{' '}
            и{' '}
            <a href="/cookies" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-teal)' }}>Политиката за бисквитки</a>.
          </span>
        </label>

        <TurnstileWidget onVerify={setTurnstileToken} />

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading || !termsAccepted} style={{ width: '100%' }}>
          {loading ? 'Регистрирам...' : 'Регистрирай се'}
        </button>
      </form>

      <p className="auth-footer-link">
        Вече имаш акаунт? <Link to="/login">Влез</Link>
      </p>
    </div>
  )
}