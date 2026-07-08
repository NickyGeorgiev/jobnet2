import { allCities } from '../data/citiesByRegion'
import { months } from '../data/months'
import { years } from '../data/years'

const eduTypes = [
  'Основно образование',
  'Средно образование',
  'Средно специално',
  'Колеж',
  'Висше образование - Бакалавър',
  'Висше образование - Магистър',
  'Доктор/PhD',
]

export function EducationSection({ education, onChange, onAdd, onRemove }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3>Образование</h3>

      {education.map((edu) => (
        <div key={edu.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Вид образование</label>
            <select
              value={edu.eduType}
              onChange={(e) => onChange(edu.id, 'eduType', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="">-- Избери --</option>
              {eduTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Училище / Университет</label>
            <input
              value={edu.eduSchoolName}
              onChange={(e) => onChange(edu.id, 'eduSchoolName', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Град</label>
            <select
              value={edu.eduCity}
              onChange={(e) => onChange(edu.id, 'eduCity', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="">-- Избери град --</option>
              {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Специалност</label>
            <input
              value={edu.eduSpeciality}
              onChange={(e) => onChange(edu.id, 'eduSpeciality', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label>Начален месец</label>
              <select
                value={edu.eduStartMonth}
                onChange={(e) => onChange(edu.id, 'eduStartMonth', e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
              >
                <option value="">Изберете</option>
                {Object.entries(months).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Начална година</label>
              <select
                value={edu.eduStartYear}
                onChange={(e) => onChange(edu.id, 'eduStartYear', e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
              >
                <option value="">Изберете</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label>Краен месец</label>
              <select
                value={edu.eduEndMonth}
                onChange={(e) => onChange(edu.id, 'eduEndMonth', e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
              >
                <option value="">Изберете</option>
                {Object.entries(months).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Крайна година</label>
              <select
                value={edu.eduEndYear}
                onChange={(e) => onChange(edu.id, 'eduEndYear', e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
              >
                <option value="">Изберете</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Кратко описание (по желание)</label>
            <textarea
              value={edu.eduDescription}
              onChange={(e) => onChange(edu.id, 'eduDescription', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
              rows={2}
            />
          </div>

          <button type="button" onClick={() => onRemove(edu.id)} style={{ color: 'red' }}>
            Премахни това образование
          </button>
        </div>
      ))}

      <button type="button" onClick={onAdd}>+ Добави образование</button>
    </div>
  )
}