import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { sectors } from '../data/sectors'
import { Spinner } from './Spinner'
import { useToast } from './Toast'
import { useSeo } from '../useSeo'
import { seo } from '../seo'
import { convertImageToWebp } from '../imageProcessing'
import { ImageCropperModal } from './ImageCropperModal'
import { SectorSelect } from './SectorSelect'
import './CompanyProfile.css'

const EMPLOYEE_COUNT_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '500+']

export function CompanyProfile() {
  useSeo(seo.companyProfile)
  const navigate = useNavigate()
  const [pendingBannerFile, setPendingBannerFile] = useState(null)
  const { showToast } = useToast()
  const { session, refreshProfile } = useAuth()
  const [formData, setFormData] = useState({
    company_name: '', bulstat: '', mol: '', sector: '', founded_year: '',
    employee_count: '', locations_count: '', bio: '',
    contact_phone: '', contact_address: '', contact_email: '', logo_url: '',
    banner_url: '', video_url: '', perks: [], values: [],
    social_facebook: '', social_linkedin: '', social_instagram: '', social_website: '',
    why_work_here: '', video_urls: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [message, setMessage] = useState('')
  const [verifying, setVerifying] = useState(false)

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
          mol: data.mol || '',
          sector: data.sector || '',
          founded_year: data.founded_year || '',
          employee_count: data.employee_count || '',
          locations_count: data.locations_count || '',
          bio: data.bio || '',
          contact_phone: data.contact_phone || '',
          contact_address: data.contact_address || '',
          contact_email: data.contact_email || '',
          logo_url: data.logo_url || '',
          banner_url: data.banner_url || '',
          video_url: data.video_url || '',
          perks: data.perks || [],
          values: data.values || [],
          social_facebook: data.social_facebook || '',
          social_linkedin: data.social_linkedin || '',
          social_instagram: data.social_instagram || '',
          social_website: data.social_website || '',
          why_work_here: data.why_work_here || '',
          video_urls: data.video_urls || [],
        })
      }
      setLoading(false)
    }
    loadCompany()
  }, [session?.user?.id])

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleLogoUpload(e) {
    const rawFile = e.target.files[0]
    if (!rawFile) return

    setUploadingLogo(true)
    setMessage('')

    let file
    try {
      file = await convertImageToWebp(rawFile)
    } catch (err) {
      setMessage('Грешка при обработка на снимката: ' + err.message)
      setUploadingLogo(false)
      return
    }

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

  function handleBannerFileSelected(e) {
    const rawFile = e.target.files[0]
    if (!rawFile) return
    setPendingBannerFile(rawFile)
    e.target.value = '' // за да може да избереш пак същия файл втори път, ако откажеш
  }

  async function handleBannerCropSave(croppedFile) {
    setPendingBannerFile(null)
    setUploadingLogo(true)
    setMessage('')

    const filePath = `${session.user.id}/banner_${Date.now()}_${croppedFile.name}`

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, croppedFile, { upsert: true })

    if (uploadError) {
      setMessage('Грешка при качване на банер: ' + uploadError.message)
      setUploadingLogo(false)
      return
    }

    const { data } = supabase.storage.from('company-logos').getPublicUrl(filePath)
    setFormData((prev) => ({ ...prev, banner_url: data.publicUrl }))
    setUploadingLogo(false)
  }

    function normalizeCompanyName(name) {
    return (name || '')
      .toUpperCase()
      .replace(/["\u201E\u201C]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  async function handleVerifyCompany() {
    const eik = formData.bulstat?.trim()

    if (!eik || !/^\d{9}$/.test(eik)) {
      showToast('ЕИК трябва да е точно 9 цифри.', 'error')
      return
    }

    setVerifying(true)

    const { data, error } = await supabase.functions.invoke(`check-company?eik=${eik}`, {
      method: 'GET',
    })

    setVerifying(false)

    if (error || !data?.valid) {
      showToast('Не открихме фирма с този ЕИК в Търговския регистър.', 'error')
      return
    }

    const registryName = normalizeCompanyName(data.registry?.fullName)
    const enteredName = normalizeCompanyName(formData.company_name)

    const nameMatches =
      registryName.includes(enteredName) || enteredName.includes(registryName)

    if (!nameMatches) {
      showToast(
        `ЕИК-ът съществува, но името не съвпада с регистъра ("${data.registry?.fullName}"). Провери дали си въвел коректното име.`,
        'error'
      )
      return
    }

    const { error: updateError } = await supabase
      .from('companies')
      .update({ eik_verified: true, eik_verified_name: data.registry?.fullName })
      .eq('id', session.user.id)

    if (updateError) {
      showToast('Грешка при запазване: ' + updateError.message, 'error')
      return
    }

    showToast('ЕИК потвърден успешно!', 'success')
    await refreshProfile()
  }

  function addListItem(field) {
    setFormData((prev) => ({ ...prev, [field]: [...prev[field], ''] }))
  }

  function updateListItem(field, index, value) {
    setFormData((prev) => {
      const next = [...prev[field]]
      next[index] = value
      return { ...prev, [field]: next }
    })
  }

  function removeListItem(field, index) {
    setFormData((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const trimmedEmail = formData.contact_email.trim()
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast('Имейлът за връзка не изглежда валиден.', 'error')
      return
    }

    const urlFields = ['social_website', 'social_facebook', 'social_linkedin', 'social_instagram']
    for (const field of urlFields) {
      const val = formData[field]?.trim()
      if (val && !/^https?:\/\//i.test(val)) {
        showToast(`Полето "${field}" трябва да е линк, започващ с http:// или https://`, 'error')
        return
      }
    }

    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('companies')
      .update({
        company_name: formData.company_name,
        bulstat: formData.bulstat,
        mol: formData.mol,
        sector: formData.sector,
        founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
        employee_count: formData.employee_count,
        locations_count: formData.locations_count ? parseInt(formData.locations_count) : null,
        bio: formData.bio,
        contact_phone: formData.contact_phone,
        contact_address: formData.contact_address,
        contact_email: formData.contact_email?.trim() || null,
        logo_url: formData.logo_url,
        banner_url: formData.banner_url,
        video_url: formData.video_url,
        perks: formData.perks.filter((p) => p.trim()),
        values: formData.values.filter((v) => v.trim()),
        social_facebook: formData.social_facebook?.trim() || null,
        social_linkedin: formData.social_linkedin?.trim() || null,
        social_instagram: formData.social_instagram?.trim() || null,
        social_website: formData.social_website?.trim() || null,
        why_work_here: formData.why_work_here,
        video_urls: formData.video_urls.filter((v) => v.trim()),
      })
      .eq('id', session.user.id)

    if (error) {
      showToast('Грешка: ' + error.message, 'error')
    } else {
      showToast('Профилът е записан успешно!', 'success')
      await refreshProfile()
      navigate('/')
    }
    setSaving(false)
  }

  if (loading) return <Spinner label="Зареждам профила..." />

  const isError = message.startsWith('Грешка')
  
  return (
    <div className="company-form-shell">
      <h2 className="company-form-title">Профил на фирмата</h2>

      <Link to={`/companies/${session?.user?.id}`} className="btn-secondary" style={{ display: 'inline-block', marginBottom: '1.5rem', textDecoration: 'none' }}>
        👁 Виж публичния си профил
      </Link>

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
              <label>ЕИК</label>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <input className="input" name="bulstat" value={formData.bulstat} onChange={handleChange} />
                <button type="button" className="btn-secondary" onClick={handleVerifyCompany} disabled={verifying} style={{ whiteSpace: 'nowrap' }}>
                  {verifying ? '...' : 'Провери'}
                </button>
              </div>
            </div>
          </div>
            <div className="field">
              <label>МОЛ (Материално отговорно лице)</label>
              <input className="input" name="mol" value={formData.mol} onChange={handleChange} />
            </div>
          
          <div className="form-row-2">
            <div className="field">
              <label>Сектор на дейност</label>
              <SectorSelect
                value={formData.sector}
                onChange={(val) => setFormData((prev) => ({ ...prev, sector: val }))}
                options={sectors}
              />
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

        <div className="company-form-section">
          <h3 className="company-form-section-title">Витрина на профила</h3>

          <div className="field">
            <label>Банер (голяма снимка отгоре на публичния профил)</label>
            {formData.banner_url && (
              <img src={formData.banner_url} alt="Банер" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }} />
            )}
            <input type="file" accept="image/*" onChange={handleBannerFileSelected} disabled={uploadingLogo} />
          </div>

          <div className="field">
            <label>Линк към видео (YouTube/Vimeo, по избор)</label>
            <input className="input" name="video_url" value={formData.video_url} onChange={handleChange} placeholder="https://youtube.com/watch?v=..." />
          </div>

          <div className="field">
            <label>Придобивки за служителите</label>
            {formData.perks.map((perk, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input className="input" value={perk} onChange={(e) => updateListItem('perks', i, e.target.value)} placeholder="напр. Гъвкаво работно време" />
                <button type="button" className="btn-text-danger" onClick={() => removeListItem('perks', i)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={() => addListItem('perks')}>+ Добави придобивка</button>
          </div>

          <div className="field">
            <label>Ценности на фирмата</label>
            {formData.values.map((val, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input className="input" value={val} onChange={(e) => updateListItem('values', i, e.target.value)} placeholder="напр. Иновация" />
                <button type="button" className="btn-text-danger" onClick={() => removeListItem('values', i)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={() => addListItem('values')}>+ Добави ценност</button>
          </div>

          <div className="field">
            <label>Защо да работиш при нас?</label>
            <textarea
              className="input"
              name="why_work_here"
              value={formData.why_work_here}
              onChange={handleChange}
              rows={4}
              placeholder="Разкажи защо кандидатите биха искали да работят точно при вас..."
            />
          </div>

          <div className="field">
            <label>Допълнителни видеа (по избор)</label>
            {formData.video_urls.map((url, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input className="input" value={url} onChange={(e) => updateListItem('video_urls', i, e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                <button type="button" className="btn-text-danger" onClick={() => removeListItem('video_urls', i)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={() => addListItem('video_urls')}>+ Добави видео</button>
          </div>

          <div className="form-row-2">
            <div className="field">
              <label>Facebook</label>
              <input className="input" name="social_facebook" value={formData.social_facebook} onChange={handleChange} placeholder="https://facebook.com/..." />
            </div>
            <div className="field">
              <label>LinkedIn</label>
              <input className="input" name="social_linkedin" value={formData.social_linkedin} onChange={handleChange} placeholder="https://linkedin.com/company/..." />
            </div>
          </div>

          <div className="form-row-2">
            <div className="field">
              <label>Instagram</label>
              <input className="input" name="social_instagram" value={formData.social_instagram} onChange={handleChange} placeholder="https://instagram.com/..." />
            </div>
            <div className="field">
              <label>Уебсайт</label>
              <input className="input" name="social_website" value={formData.social_website} onChange={handleChange} placeholder="https://..." />
            </div>
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

      {pendingBannerFile && (
        <ImageCropperModal
          imageFile={pendingBannerFile}
          aspect={732 / 260}
          outputWidth={1200}
          outputHeight={426}
          title="Нагласи банера"
          onCancel={() => setPendingBannerFile(null)}
          onSave={handleBannerCropSave}
        />
      )}
    </div>
  )
}