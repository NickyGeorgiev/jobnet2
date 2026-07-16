import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { sectors } from '../data/sectors'
import './CompanyProfile.css'

const EMPLOYEE_COUNT_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '500+']

export function CompanyProfile() {
  const { session } = useAuth()
  const [formData, setFormData] = useState({
    company_name: '', bulstat: '', sector: '', founded_year: '',
    employee_count: '', locations_count: '', bio: '',
    contact_phone: '', contact_address: '', contact_email: '', logo_url: '',
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

  const isError = message.startsWith('Грешка')

  return (
    <div className="company-form-shell">
      <h2 className="company-form-title">Профил на фирмата</h2>

      <form onSubmit={handleSubmit}>
        <div className="company-form-section">
          <h3 className="company-form-section-title">Основна информация</h3>

          <div className="company-logo-upload-row">
            {formData.logo_url ? (
              <img src={formData.logo_url} alt="лого" className="company-logo-preview" />
            ) : (
              <div className="company-logo-preview-placeholder">🏢</div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Лого на фирмата</label>
              <input type="file" accept="image/*" onChange={handleLogoUpload} />
              {uploadingLogo && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Качвам...</p>}
            </div>
          </div>

          <div className="field">
            <label>Име на фирмата</label>
            <input className="input" name="company_name" value={formData.company_name} onChange={handleChange} required />
          </div>

          <div className="form-row-2">
            <div className="field">
              <label>Булстат</label>
              <input className="input" name="bulstat" value={formData.bulstat} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Сектор на дейност</label>
              <select className="input" name="sector" value={formData.sector} onChange={handleChange}>
                <option value="">-- Избери сектор --</option>
                {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div className="field">
              <label>Година на основаване</label>
              <input type="number" className="input" name="founded_year" value={formData.founded_year} onChange={handleChange}
                placeholder="напр. 2015" min="1800" max={new Date().getFullYear()} />
            </div>
            <div className="field">
              <label>Брой служители</label>
              <select className="input" name="employee_count" value={formData.employee_count} onChange={handleChange}>
                <option value="">-- Избери --</option>
                {EMPLOYEE_COUNT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Брой обекти</label>
            <input type="number" className="input" name="locations_count" value={formData.locations_count} onChange={handleChange} min="1" />
          </div>

          <div className="field">
            <label>За фирмата</label>
            <textarea className="input" name="bio" value={formData.bio} onChange={handleChange}
              rows={4} placeholder="Кратко описание на дейността на фирмата..." />
          </div>
        </div>

        <div className="company-form-section">
          <h3 className="company-form-section-title">Контакти</h3>

          <div className="field">
            <label>Телефон за контакт</label>
            <input className="input" name="contact_phone" value={formData.contact_phone} onChange={handleChange} />
          </div>

          <div className="field">
            <label>Имейл за контакт</label>
            <input type="email" className="input" name="contact_email" value={formData.contact_email} onChange={handleChange} />
          </div>

          <div className="field">
            <label>Адрес</label>
            <input className="input" name="contact_address" value={formData.contact_address} onChange={handleChange} />
          </div>
        </div>

        {message && (
          <div className={`company-form-message ${isError ? 'company-form-message--error' : 'company-form-message--success'}`}>
            {message}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Записвам...' : 'Запази профил'}
        </button>
      </form>
    </div>
  )
}