import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { sectors } from '../data/sectors'
import { allCities } from '../data/citiesByRegion'
import { WorkExperienceSection } from './WorkExperienceSection'
import { EducationSection } from './EducationSection'
import { LanguagesSection } from './LanguagesSection'
import { CheckboxMultiSelect } from './CheckboxMultiSelect'
import { Spinner } from './Spinner'
import { useToast } from './Toast'
import './MyCv.css'

const LEVEL_OPTIONS = [
  'Ниво работници',
  'Ниво експерти/специалисти',
  'Средно или ниско управленско ниво',
  'Висш мениджмънт',
]

const DURATION_OPTIONS = [
  'На пълен работен ден (8ч.)',
  'На непълен работен ден (4,6ч./почасово)',
  'Стажант/Freelancer',
]

function emptyWorkExperience() {
  return {
    id: crypto.randomUUID(), position: '', company: '', sector: '', city: '',
    workStartMonth: '', workStartYear: '', current: false,
    workEndMonth: '', workEndYear: '', responsibilities: '',
  }
}

function emptyEducation() {
  return {
    id: crypto.randomUUID(), eduType: '', eduSchoolName: '', eduCity: '',
    eduSpeciality: '', eduStartMonth: '', eduStartYear: '',
    eduEndMonth: '', eduEndYear: '', eduDescription: '',
  }
}

function emptyLanguage() {
  return { id: crypto.randomUUID(), language: '', level: '' }
}

export function MyCv() {
  const { session } = useAuth()
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    fname: '', lname: '', phone: '', birth_date: '', gender: '',
    current_city: '', description: '', skills: '', computer_skills: '',
    driver_license: '', contact_email: '', target_salary: '', target_sector: [], target_cities: [],
    target_level: [], target_duration: [], avatar_url: '',
  })
  const [workExperience, setWorkExperience] = useState([])
  const [education, setEducation] = useState([])
  const [languages, setLanguages] = useState([])
  const [moreCourses, setMoreCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadCv() {
      const { data } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setFormData({
          fname: data.fname || '',
          lname: data.lname || '',
          phone: data.phone || '',
          birth_date: data.birth_date || '',
          gender: data.gender || '',
          current_city: data.current_city || '',
          description: data.description || '',
          skills: data.skills || '',
          computer_skills: data.computer_skills || '',
          driver_license: data.driver_license || '',
          contact_email: data.contact_email || '',
          target_salary: data.target_salary || '',
          target_sector: data.target_sector || [],
          target_cities: data.target_cities || [],
          target_level: data.target_level || [],
          target_duration: data.target_duration || [],
          avatar_url: data.avatar_url || '',
        })
        setWorkExperience(data.work_experience?.length > 0 ? data.work_experience : [])
        setEducation(data.education?.length > 0 ? data.education : [])
        setLanguages(data.languages?.length > 0 ? data.languages : [])
        setMoreCourses(data.more_courses?.length > 0 ? data.more_courses : [])
      }
      setLoading(false)
    }
    loadCv()
  }, [session])

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  function handleCheckboxGroupChange(field, value, checked) {
    setFormData((prev) => {
      const current = prev[field]
      const updated = checked ? [...current, value] : current.filter((v) => v !== value)
      return { ...prev, [field]: updated }
    })
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploadingAvatar(true)
    setMessage('')

    const filePath = `${session.user.id}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setMessage('Грешка при качване на снимка: ' + uploadError.message)
      setUploadingAvatar(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    setFormData((prev) => ({ ...prev, avatar_url: data.publicUrl }))
    setUploadingAvatar(false)
  }

  function addWorkExperience() { setWorkExperience([...workExperience, emptyWorkExperience()]) }
  function handleWorkExperienceChange(id, field, value) {
    setWorkExperience(workExperience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp))
  }
  function removeWorkExperience(id) { setWorkExperience(workExperience.filter(exp => exp.id !== id)) }

  function addEducation() { setEducation([...education, emptyEducation()]) }
  function handleEducationChange(id, field, value) {
    setEducation(education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu))
  }
  function removeEducation(id) { setEducation(education.filter(edu => edu.id !== id)) }

  function addLanguage() { setLanguages([...languages, emptyLanguage()]) }
  function handleLanguageChange(id, field, value) {
    setLanguages(languages.map(lang => lang.id === id ? { ...lang, [field]: value } : lang))
  }
  function removeLanguage(id) { setLanguages(languages.filter(lang => lang.id !== id)) }

  function addCourse() { setMoreCourses([...moreCourses, '']) }
  function handleCourseChange(index, value) {
    setMoreCourses(moreCourses.map((c, i) => i === index ? value : c))
  }
  function removeCourse(index) {
    setMoreCourses(moreCourses.filter((_, i) => i !== index))
  }

  function validate() {
    const missing = []
    if (!formData.fname.trim()) missing.push('Име')
    if (!formData.lname.trim()) missing.push('Фамилия')
    if (!formData.phone.trim()) missing.push('Телефон')
    if (!formData.current_city) missing.push('Настоящ град')
    if (!formData.avatar_url) missing.push('Снимка на профила')
    if (!formData.target_salary) missing.push('Желана заплата')
    if (formData.target_sector.length === 0) missing.push('Желани сектори (поне 1)')
    if (formData.target_cities.length === 0) missing.push('Желани градове (поне 1)')
    if (formData.target_level.length === 0) missing.push('Ниво (поне 1)')
    if (formData.target_duration.length === 0) missing.push('Заетост (поне 1)')
    return missing
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')

    const missing = validate()
    if (missing.length > 0) {
      setMessage('Моля, попълнете задължителните полета: ' + missing.join(', '))
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('candidates')
      .update({
        fname: formData.fname,
        lname: formData.lname,
        phone: formData.phone,
        birth_date: formData.birth_date || null,
        gender: formData.gender,
        current_city: formData.current_city,
        description: formData.description,
        skills: formData.skills,
        computer_skills: formData.computer_skills,
        driver_license: formData.driver_license,
        contact_email: formData.contact_email,
        avatar_url: formData.avatar_url,
        target_salary: formData.target_salary ? parseInt(formData.target_salary) : null,
        target_sector: formData.target_sector,
        target_cities: formData.target_cities,
        target_level: formData.target_level,
        target_duration: formData.target_duration,
        work_experience: workExperience,
        education: education,
        languages: languages,
        more_courses: moreCourses,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id)

    if (error) {
      showToast('Грешка: ' + error.message, 'error')
    } else {
      showToast('CV-то е записано успешно!', 'success')
    }
    setSaving(false)
  }

  if (loading) return <Spinner label="Зареждам CV-то..." />

  const isError = message.startsWith('Грешка') || message.startsWith('Моля')

  return (
    <div className="cv-form-shell">
      <h2 className="cv-form-title">Моето CV</h2>
      <p className="cv-form-hint">Полетата, отбелязани с * , са задължителни.</p>

      <form onSubmit={handleSubmit}>
        <div className="cv-form-section">
          <h3 className="cv-form-section-title">Основна информация</h3>

          <div className="cv-avatar-upload-row">
            {formData.avatar_url ? (
              <img src={formData.avatar_url} alt="avatar" className="cv-avatar-preview" />
            ) : (
              <div className="cv-avatar-preview-placeholder">👤</div>
            )}
            <div className="file-input-wrap">
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Снимка на профила *</label>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} />
              {uploadingAvatar && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Качвам...</p>}
            </div>
          </div>

          <div className="field">
            <label>Име *</label>
            <input className="input" name="fname" value={formData.fname} onChange={handleChange} required />
          </div>

          <div className="field">
            <label>Фамилия *</label>
            <input className="input" name="lname" value={formData.lname} onChange={handleChange} required />
          </div>

          <div className="field">
            <label>Дата на раждане</label>
            <input type="date" className="input" name="birth_date" value={formData.birth_date} onChange={handleChange} />
          </div>

          <div className="field">
            <label>Пол</label>
            <div className="gender-row">
              <label className="gender-option">
                <input type="radio" name="gender" value="Мъж" checked={formData.gender === 'Мъж'} onChange={handleChange} /> Мъж
              </label>
              <label className="gender-option">
                <input type="radio" name="gender" value="Жена" checked={formData.gender === 'Жена'} onChange={handleChange} /> Жена
              </label>
            </div>
          </div>

          <div className="field">
            <label>Имейл за връзка</label>
            <input type="email" className="input" name="contact_email" value={formData.contact_email} onChange={handleChange} />
          </div>

          <div className="field">
            <label>Телефон *</label>
            <input className="input" name="phone" value={formData.phone} onChange={handleChange} required />
          </div>

          <div className="field">
            <label>Настоящ град *</label>
            <select className="input" name="current_city" value={formData.current_city} onChange={handleChange} required>
              <option value="">-- Избери град --</option>
              {allCities.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Описание / За мен</label>
            <textarea className="input" name="description" value={formData.description} onChange={handleChange} rows={4} />
          </div>
        </div>

        <div className="cv-form-section">
          <h3 className="cv-form-section-title">Допълнителна информация</h3>

          <div className="field">
            <label>Умения</label>
            <input className="input" name="skills" value={formData.skills} onChange={handleChange} />
          </div>

          <div className="field">
            <label>Компютърни умения</label>
            <input className="input" name="computer_skills" value={formData.computer_skills} onChange={handleChange} />
          </div>

          <div className="field">
            <label>Шофьорска книжка</label>
            <input className="input" name="driver_license" value={formData.driver_license} onChange={handleChange} placeholder="напр. Категория B" />
          </div>

          <div className="field">
            <label>Допълнителни курсове/сертификати</label>
            {moreCourses.map((course, index) => (
              <div key={index} className="cv-course-row">
                <input className="input" value={course} onChange={(e) => handleCourseChange(index, e.target.value)} />
                <button type="button" className="cv-entry-remove" onClick={() => removeCourse(index)}>✕</button>
              </div>
            ))}
            <button type="button" className="cv-add-btn" onClick={addCourse}>+ Добави курс</button>
          </div>
        </div>

        <LanguagesSection
          languages={languages}
          onChange={handleLanguageChange}
          onAdd={addLanguage}
          onRemove={removeLanguage}
        />

        <WorkExperienceSection
          workExperience={workExperience}
          onChange={handleWorkExperienceChange}
          onAdd={addWorkExperience}
          onRemove={removeWorkExperience}
        />

        <EducationSection
          education={education}
          onChange={handleEducationChange}
          onAdd={addEducation}
          onRemove={removeEducation}
        />

        <div className="cv-form-section">
          <h3 className="cv-form-section-title">Критерии за търсене на работа</h3>

          <div className="field">
            <label>Желана нетна заплата (лв) *</label>
            <input type="number" className="input" name="target_salary" value={formData.target_salary} onChange={handleChange} required />
          </div>

          <CheckboxMultiSelect
            label="Желани сектори *"
            options={sectors}
            selected={formData.target_sector}
            onChange={(values) => setFormData({ ...formData, target_sector: values })}
          />

          <CheckboxMultiSelect
            label="Желани градове *"
            options={allCities}
            selected={formData.target_cities}
            onChange={(values) => setFormData({ ...formData, target_cities: values })}
          />

          <div className="checkbox-group">
            <label className="checkbox-group-label">На какво ниво искате да се реализирате? *</label>
            {LEVEL_OPTIONS.map((level) => (
              <label key={level} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={formData.target_level.includes(level)}
                  onChange={(e) => handleCheckboxGroupChange('target_level', level, e.target.checked)}
                />
                {level}
              </label>
            ))}
          </div>

          <div className="checkbox-group">
            <label className="checkbox-group-label">Каква заетост предпочитате? *</label>
            {DURATION_OPTIONS.map((duration) => (
              <label key={duration} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={formData.target_duration.includes(duration)}
                  onChange={(e) => handleCheckboxGroupChange('target_duration', duration, e.target.checked)}
                />
                {duration}
              </label>
            ))}
          </div>
        </div>

        {message && (
          <div className={`cv-form-message ${isError ? 'cv-form-message--error' : 'cv-form-message--success'}`}>
            {message}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Записвам...' : 'Запази CV'}
        </button>
      </form>
    </div>
  )
}