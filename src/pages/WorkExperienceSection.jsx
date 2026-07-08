import { sectors } from '../data/sectors'
import { allCities } from '../data/citiesByRegion'
import { months } from '../data/months'
import { years } from '../data/years'

export function WorkExperienceSection({ workExperience, onChange, onAdd, onRemove }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3>Трудов опит</h3>

      {workExperience.map((exp) => (
        <div key={exp.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Позиция</label>
            <input
              value={exp.position}
              onChange={(e) => onChange(exp.id, 'position', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Фирма</label>
            <input
              value={exp.company}
              onChange={(e) => onChange(exp.id, 'company', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Сектор</label>
            <select
              value={exp.sector}
              onChange={(e) => onChange(exp.id, 'sector', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="">-- Избери сектор --</option>
              {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Град</label>
            <select
              value={exp.city}
              onChange={(e) => onChange(exp.id, 'city', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="">-- Избери град --</option>
              {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label>Начален месец</label>
              <select
                value={exp.workStartMonth}
                onChange={(e) => onChange(exp.id, 'workStartMonth', e.target.value)}
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
                value={exp.workStartYear}
                onChange={(e) => onChange(exp.id, 'workStartYear', e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
              >
                <option value="">Изберете</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>
              <input
                type="checkbox"
                checked={exp.current}
                onChange={(e) => onChange(exp.id, 'current', e.target.checked)}
              />
              {' '}Все още работя тук
            </label>
          </div>

          {!exp.current && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label>Краен месец</label>
                <select
                  value={exp.workEndMonth}
                  onChange={(e) => onChange(exp.id, 'workEndMonth', e.target.value)}
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
                  value={exp.workEndYear}
                  onChange={(e) => onChange(exp.id, 'workEndYear', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem' }}
                >
                  <option value="">Изберете</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Отговорности (кратко описание)</label>
            <textarea
              value={exp.responsibilities}
              onChange={(e) => onChange(exp.id, 'responsibilities', e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
              rows={3}
            />
          </div>

          <button type="button" onClick={() => onRemove(exp.id)} style={{ color: 'red' }}>
            Премахни това работно място
          </button>
        </div>
      ))}

      <button type="button" onClick={onAdd}>+ Добави трудов опит</button>
    </div>
  )
}