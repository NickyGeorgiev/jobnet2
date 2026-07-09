import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { sectors } from '../data/sectors'

export function CompanyProfile() {
  const { session } = useAuth()
  const [formData, setFormData] = useState({
    company_name: '',
    bulstat: '',
    sector: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadCompany() {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setFormData({
          company_name: data.company_name || '',
          bulstat: data.bulstat || '',
          sector: data.sector || '',
        })
      }
      setLoading(false)
    }
    loadCompany()
  }, [session])

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('companies')
      .update({
        company_name: formData.company_name,
        bulstat: formData.bulstat,
        sector: formData.sector,
      })
      .eq('id', session.user.id)

    if (error) {
      setMessage('Грешка: ' + error.message)
    } else {
      setMessage('Записано успешно!')
    }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: '500px' }}>
      <h2>Профил на фирмата</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Име на фирмата</label>
          <input name="company_name" value={formData.company_name} onChange={handleChange}
            required style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Булстат</label>
          <input name="bulstat" value={formData.bulstat} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Сектор на дейност</label>
          <select name="sector" value={formData.sector} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }}>
            <option value="">-- Избери сектор --</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {message && <p style={{ color: message.startsWith('Грешка') ? 'red' : 'green' }}>{message}</p>}

        <button type="submit" disabled={saving}>
          {saving ? 'Записвам...' : 'Запази профил'}
        </button>
      </form>
    </div>
  )
}