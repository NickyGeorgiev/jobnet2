import { sectors } from '../data/sectors'
import { allCities } from '../data/citiesByRegion'
import { months } from '../data/months'
import { years } from '../data/years'

export function WorkExperienceSection({ workExperience, onChange, onAdd, onRemove }) {
  return (
    <div className="cv-form-section">
      <h3 className="cv-form-section-title">Трудов опит</h3>

      {workExperience.map((exp) => (
        <div key={exp.id} className="cv-entry-card">
          <div className="field">
            <label>Позиция</label>
            <input className="input" value={exp.position} onChange={(e) => onChange(exp.id, 'position', e.target.value)} />
          </div>

          <div className="field">
            <label>Фирма</label>
            <input className="input" value={exp.company} onChange={(e) => onChange(exp.id, 'company', e.target.value)} />
          </div>

          <div className="cv-entry-row">
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Сектор</label>
              <select className="input" value={exp.sector} onChange={(e) => onChange(exp.id, 'sector', e.target.value)}>
                <option value="">-- Избери сектор --</option>
                {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Град</label>
              <select className="input" value={exp.city} onChange={(e) => onChange(exp.id, 'city', e.target.value)}>
                <option value="">-- Избери град --</option>
                {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="cv-entry-row">
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Начален месец</label>
              <select className="input" value={exp.workStartMonth} onChange={(e) => onChange(exp.id, 'workStartMonth', e.target.value)}>
                <option value="">Изберете</option>
                {Object.entries(months).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Начална година</label>
              <select className="input" value={exp.workStartYear} onChange={(e) => onChange(exp.id, 'workStartYear', e.target.value)}>
                <option value="">Изберете</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <label className="cv-current-checkbox">
            <input type="checkbox" checked={exp.current} onChange={(e) => onChange(exp.id, 'current', e.target.checked)} />
            Все още работя тук
          </label>

          {!exp.current && (
            <div className="cv-entry-row">
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Краен месец</label>
                <select className="input" value={exp.workEndMonth} onChange={(e) => onChange(exp.id, 'workEndMonth', e.target.value)}>
                  <option value="">Изберете</option>
                  {Object.entries(months).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Крайна година</label>
                <select className="input" value={exp.workEndYear} onChange={(e) => onChange(exp.id, 'workEndYear', e.target.value)}>
                  <option value="">Изберете</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="field">
            <label>Отговорности (кратко описание)</label>
            <textarea className="input" value={exp.responsibilities} onChange={(e) => onChange(exp.id, 'responsibilities', e.target.value)} rows={3} />
          </div>

          <button type="button" className="cv-entry-remove" onClick={() => onRemove(exp.id)}>Премахни това работно място</button>
        </div>
      ))}

      <button type="button" className="cv-add-btn" onClick={onAdd}>+ Добави трудов опит</button>
    </div>
  )
}