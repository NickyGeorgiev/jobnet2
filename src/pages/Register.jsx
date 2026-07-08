import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export function Register() {
  const navigate = useNavigate()
  const [role, setRole] = useState('candidate')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Стъпка 1: създаваме auth потребител в Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const userId = authData.user.id

    // Стъпка 2: създаваме ред в profiles с избраната роля
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: userId, role: role })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // Стъпка 3: ако е кандидат, създаваме празен candidates ред
    if (role === 'candidate') {
      await supabase.from('candidates').insert({ id: userId })
    } else {
      await supabase.from('companies').insert({ id: userId, company_name: '' })
    }

    setLoading(false)
    navigate('/')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '400px' }}>
      <h2>Регистрация</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            <input
              type="radio"
              value="candidate"
              checked={role === 'candidate'}
              onChange={(e) => setRole(e.target.value)}
            />
            Аз съм кандидат
          </label>
          <br />
          <label>
            <input
              type="radio"
              value="company"
              checked={role === 'company'}
              onChange={(e) => setRole(e.target.value)}
            />
            Аз съм фирма
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <input
            type="password"
            placeholder="Парола"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Регистрирам...' : 'Регистрирай се'}
        </button>
      </form>
    </div>
  )
}