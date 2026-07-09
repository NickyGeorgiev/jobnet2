import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { sectors } from '../data/sectors'
import { allCities } from '../data/citiesByRegion'
import { WorkExperienceSection } from './WorkExperienceSection'
import { EducationSection } from './EducationSection'
import { LanguagesSection } from './LanguagesSection'

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
  const [formData, setFormData] = useState({
    fname: '', lname: '', phone: '', birth_date: '', gender: '',
    current_city: '', description: '', skills: '', computer_skills: '',
    driver_license: '', target_salary: '', target_sector: [], target_cities: [],
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

  function handleMultiSelectChange(e) {
    const selectedValues = Array.from(e.target.selectedOptions).map(option => option.value)
    setFormData({ ...formData, [e.target.name]: selectedValues })
  }

  function handleCheckboxGroupChange(field, value, checked) {
    setFormData((prev) => {
      const current = prev[field]
      const updated = checked ? [...current, value] : current.filter((v) => v !== value)
      return { ...prev, [field]: updated }
    })
  }

  // --- Снимка на профила ---
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

  // Работен опит
  function addWorkExperience() { setWorkExperience([...workExperience, emptyWorkExperience()]) }
  function handleWorkExperienceChange(id, field, value) {
    setWorkExperience(workExperience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp))
  }
  function removeWorkExperience(id) { setWorkExperience(workExperience.filter(exp => exp.id !== id)) }

  // Образование
  function addEducation() { setEducation([...education, emptyEducation()]) }
  function handleEducationChange(id, field, value) {
    setEducation(education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu))
  }
  function removeEducation(id) { setEducation(education.filter(edu => edu.id !== id)) }

  // Езици
  function addLanguage() { setLanguages([...languages, emptyLanguage()]) }
  function handleLanguageChange(id, field, value) {
    setLanguages(languages.map(lang => lang.id === id ? { ...lang, [field]: value } : lang))
  }
  function removeLanguage(id) { setLanguages(languages.filter(lang => lang.id !== id)) }

  // Курсове
  function addCourse() { setMoreCourses([...moreCourses, '']) }
  function handleCourseChange(index, value) {
    setMoreCourses(moreCourses.map((c, i) => i === index ? value : c))
  }
  function removeCourse(index) {
    setMoreCourses(moreCourses.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

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
      setMessage('Грешка: ' + error.message)
    } else {
      setMessage('Записано успешно!')
    }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <h2>Моето CV</h2>

      <form onSubmit={handleSubmit}>
        <h3>Основна информация</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label>Снимка на профила</label><br />
          {formData.avatar_url && (
            <img src={formData.avatar_url} alt="avatar"
              style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%', display: 'block', marginBottom: '0.5rem' }} />
          )}
          <input type="file" accept="image/*" onChange={handleAvatarUpload} />
          {uploadingAvatar && <p>Качвам...</p>}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Име</label>
          <input name="fname" value={formData.fname} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Фамилия</label>
          <input name="lname" value={formData.lname} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Дата на раждане</label>
          <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Пол</label><br />
          <label style={{ marginRight: '1rem' }}>
            <input type="radio" name="gender" value="Мъж"
              checked={formData.gender === 'Мъж'} onChange={handleChange} /> Мъж
          </label>
          <label>
            <input type="radio" name="gender" value="Жена"
              checked={formData.gender === 'Жена'} onChange={handleChange} /> Жена
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Телефон</label>
          <input name="phone" value={formData.phone} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Настоящ град</label>
          <select name="current_city" value={formData.current_city} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }}>
            <option value="">-- Избери град --</option>
            {allCities.map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Описание / За мен</label>
          <textarea name="description" value={formData.description} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }} rows={4} />
        </div>

        <hr style={{ margin: '2rem 0' }} />
        <h3>Допълнителна информация</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label>Умения</label>
          <input name="skills" value={formData.skills} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Компютърни умения</label>
          <input name="computer_skills" value={formData.computer_skills} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Шофьорска книжка</label>
          <input name="driver_license" value={formData.driver_license} onChange={handleChange}
            placeholder="напр. Категория B" style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Допълнителни курсове/сертификати</label>
          {moreCourses.map((course, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input value={course} onChange={(e) => handleCourseChange(index, e.target.value)}
                style={{ flex: 1, padding: '0.5rem' }} />
              <button type="button" onClick={() => removeCourse(index)} style={{ color: 'red' }}>✕</button>
            </div>
          ))}
          <button type="button" onClick={addCourse}>+ Добави курс</button>
        </div>

        <LanguagesSection
          languages={languages}
          onChange={handleLanguageChange}
          onAdd={addLanguage}
          onRemove={removeLanguage}
        />

        <hr style={{ margin: '2rem 0' }} />

        <WorkExperienceSection
          workExperience={workExperience}
          onChange={handleWorkExperienceChange}
          onAdd={addWorkExperience}
          onRemove={removeWorkExperience}
        />

        <hr style={{ margin: '2rem 0' }} />

        <EducationSection
          education={education}
          onChange={handleEducationChange}
          onAdd={addEducation}
          onRemove={removeEducation}
        />

        <hr style={{ margin: '2rem 0' }} />
        <h3>Критерии за търсене на работа</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label>Желана нетна заплата (лв)</label>
          <input type="number" name="target_salary" value={formData.target_salary} onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Желани сектори (задръж Ctrl/Cmd за избор на няколко)</label>
          <select multiple name="target_sector" value={formData.target_sector}
            onChange={handleMultiSelectChange}
            style={{ width: '100%', padding: '0.5rem', height: '150px' }}>
            {sectors.map(sector => <option key={sector} value={sector}>{sector}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Желани градове (задръж Ctrl/Cmd за избор на няколко)</label>
          <select multiple name="target_cities" value={formData.target_cities}
            onChange={handleMultiSelectChange}
            style={{ width: '100%', padding: '0.5rem', height: '150px' }}>
            {allCities.map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>На какво ниво искате да се реализирате?</label>
          {LEVEL_OPTIONS.map((level) => (
            <div key={level}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.target_level.includes(level)}
                  onChange={(e) => handleCheckboxGroupChange('target_level', level, e.target.checked)}
                />
                {' '}{level}
              </label>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Каква заетост предпочитате?</label>
          {DURATION_OPTIONS.map((duration) => (
            <div key={duration}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.target_duration.includes(duration)}
                  onChange={(e) => handleCheckboxGroupChange('target_duration', duration, e.target.checked)}
                />
                {' '}{duration}
              </label>
            </div>
          ))}
        </div>

        {message && <p style={{ color: message.startsWith('Грешка') ? 'red' : 'green' }}>{message}</p>}

        <button type="submit" disabled={saving}>
          {saving ? 'Записвам...' : 'Запази CV'}
        </button>
      </form>
    </div>
  )
}