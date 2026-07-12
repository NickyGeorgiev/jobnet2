import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { sectors } from '../data/sectors'

const EMPLOYEE_COUNT_OPTIONS = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '500+',
]

export function CompanyProfile() {
  const { session } = useAuth()
  const [formData, setFormData] = useState({
    company_name: '',
    bulstat: '',
    sector: '',
    founded_year: '',
    employee_count: '',
    locations_count: '',
    bio: '',
    contact_phone: '',
    contact_address: '',
    contact_email: '',
    logo_url: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
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
          founded_year: data.founded_year || '',
          employee_count: data.employee_count || '',
          locations_count: data.locations_count || '',
          bio: data.bio || '',
          contact_phone: data.contact_phone || '',
          contact_address: data.contact_address || '',
          contact_email: data.contact_email || '',
          logo_url: data.logo_url || '',
        })
      }
      setLoading(false)
    }
    loadCompany()
  }, [session])

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploadingLogo(true)
    setMessage('')

    const filePath = `${session.user.id}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setMessage('Грешка при качване на лого: ' + uploadError.message)
      setUploadingLogo(false)
      return
    }

    const { data } = supabase.storage.from('company-logos').getPublicUrl(filePath)
    setFormData((prev) => ({ ...prev, logo_url: data.publicUrl }))
    setUploadingLogo(false)
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
        founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
        employee_count: formData.employee_count,
        locations_count: formData.locations_count ? parseInt(formData.locations_count) : null,
        bio: formData.bio,
        contact_phone: formData.contact_phone,
        contact_address: formData.contact_address,
        contact_email: formData.contact_email,
        logo_url: formData.logo_url,
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
          <label>Лого на фирмата</label><br />
          {formData.logo_url && (
            <img src={formData.logo_url} alt="лого"
              style={{ width: '120px', height: '120px', objectFit: 'contain', border: '1px solid #eee', display: 'block', marginBottom: '0.5rem' }} />
          )}
          <input type="file" accept="image/*" onChange={handleLogoUpload} />
          {uploadingLogo && <p>Качвам...</p>}
        </div>

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

        <div style={{ marginBottom: '1rem' }}>
          <label>Година на основаване</label>
          <input type="number" name="founded_year" value={formData.founded_year} onChange={handleChange}
            placeholder="напр. 2015" min="1800" max={new Date().getFullYear()}
            style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Брой служители</label>
          <select name="employee_count" value={formData.employee_count} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }}>
            <option value="">-- Избери --</option>
            {EMPLOYEE_COUNT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Брой обекти</label>
          <input type="number" name="locations_count" value={formData.locations_count} onChange={handleChange}
            min="1" style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>За фирмата</label>
          <textarea name="bio" value={formData.bio} onChange={handleChange}
            rows={4} placeholder="Кратко описание на дейността на фирмата..."
            style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <hr style={{ margin: '1.5rem 0' }} />
        <h3>Контакти</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label>Телефон за контакт</label>
          <input name="contact_phone" value={formData.contact_phone} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Имейл за контакт</label>
          <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Адрес</label>
          <input name="contact_address" value={formData.contact_address} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        {message && <p style={{ color: message.startsWith('Грешка') ? 'red' : 'green' }}>{message}</p>}

        <button type="submit" disabled={saving}>
          {saving ? 'Записвам...' : 'Запази профил'}
        </button>
      </form>
    </div>
  )
}