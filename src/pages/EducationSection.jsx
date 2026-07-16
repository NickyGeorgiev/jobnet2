import { allCities } from '../data/citiesByRegion'
import { months } from '../data/months'
import { years } from '../data/years'

const eduTypes = [
  'Основно образование', 'Средно образование', 'Средно специално', 'Колеж',
  'Висше образование - Бакалавър', 'Висше образование - Магистър', 'Доктор/PhD',
]

export function EducationSection({ education, onChange, onAdd, onRemove }) {
  return (
    <div className="cv-form-section">
      <h3 className="cv-form-section-title">Образование</h3>

      {education.map((edu) => (
        <div key={edu.id} className="cv-entry-card">
          <div className="field">
            <label>Вид образование</label>
            <select className="input" value={edu.eduType} onChange={(e) => onChange(edu.id, 'eduType', e.target.value)}>
              <option value="">-- Избери --</option>
              {eduTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Училище / Университет</label>
            <input className="input" value={edu.eduSchoolName} onChange={(e) => onChange(edu.id, 'eduSchoolName', e.target.value)} />
          </div>

          <div className="field">
            <label>Град</label>
            <select className="input" value={edu.eduCity} onChange={(e) => onChange(edu.id, 'eduCity', e.target.value)}>
              <option value="">-- Избери град --</option>
              {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Специалност</label>
            <input className="input" value={edu.eduSpeciality} onChange={(e) => onChange(edu.id, 'eduSpeciality', e.target.value)} />
          </div>

          <div className="cv-entry-row">
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Начален месец</label>
              <select className="input" value={edu.eduStartMonth} onChange={(e) => onChange(edu.id, 'eduStartMonth', e.target.value)}>
                <option value="">Изберете</option>
                {Object.entries(months).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Начална година</label>
              <select className="input" value={edu.eduStartYear} onChange={(e) => onChange(edu.id, 'eduStartYear', e.target.value)}>
                <option value="">Изберете</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="cv-entry-row">
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Краен месец</label>
              <select className="input" value={edu.eduEndMonth} onChange={(e) => onChange(edu.id, 'eduEndMonth', e.target.value)}>
                <option value="">Изберете</option>
                {Object.entries(months).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Крайна година</label>
              <select className="input" value={edu.eduEndYear} onChange={(e) => onChange(edu.id, 'eduEndYear', e.target.value)}>
                <option value="">Изберете</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Кратко описание (по желание)</label>
            <textarea className="input" value={edu.eduDescription} onChange={(e) => onChange(edu.id, 'eduDescription', e.target.value)} rows={2} />
          </div>

          <button type="button" className="cv-entry-remove" onClick={() => onRemove(edu.id)}>Премахни това образование</button>
        </div>
      ))}

      <button type="button" className="cv-add-btn" onClick={onAdd}>+ Добави образование</button>
    </div>
  )
}