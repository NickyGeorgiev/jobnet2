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

  async function handleOAuth(provider) {
    if (!termsAccepted) {
      setError('Трябва да приемете Общите условия и Политиката за поверителност, за да продължите.')
      return
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/' },
    })
    if (oauthError) setError(oauthError.message)
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

        {role === 'candidate' && (
          <>
            <button type="button" className="oauth-btn" onClick={() => handleOAuth('google')}>
              <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.43.36-2.09V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.85Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53Z"/></svg>
              Продължи с Google
            </button>
            <button type="button" className="oauth-btn" onClick={() => handleOAuth('linkedin_oidc')}>
              <svg viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z"/></svg>
              Продължи с LinkedIn
            </button>
            <div className="oauth-divider">или</div>
          </>
        )}

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