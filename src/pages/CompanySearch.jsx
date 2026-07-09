import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { sectors } from '../data/sectors'
import { allCities } from '../data/citiesByRegion'

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

// Превръща JS масив в правилно "опакован" Postgres array literal,
// така стойности със запетаи вътре (напр. имена на сектори) не се чупят.
function toPgArrayLiteral(arr) {
  const escaped = arr.map((v) => `"${v.replace(/"/g, '\\"')}"`)
  return `{${escaped.join(',')}}`
}

export function CompanySearch() {
  const [offeredSalary, setOfferedSalary] = useState('')
  const [selectedSectors, setSelectedSectors] = useState([])
  const [selectedCities, setSelectedCities] = useState([])
  const [selectedLevels, setSelectedLevels] = useState([])
  const [selectedDurations, setSelectedDurations] = useState([])
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleMultiSelectChange(setter) {
    return (e) => {
      const values = Array.from(e.target.selectedOptions).map((o) => o.value)
      setter(values)
    }
  }

  function handleCheckboxGroup(setter, currentValues, value, checked) {
    setter(checked ? [...currentValues, value] : currentValues.filter((v) => v !== value))
  }

  async function handleSearch(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let query = supabase
      .from('candidates')
      .select('*')
      .eq('active', true)

    if (offeredSalary) {
      query = query.lte('target_salary', parseInt(offeredSalary))
    }
    if (selectedSectors.length > 0) {
      query = query.filter('target_sector', 'ov', toPgArrayLiteral(selectedSectors))
    }
    if (selectedCities.length > 0) {
      query = query.filter('target_cities', 'ov', toPgArrayLiteral(selectedCities))
    }
    if (selectedLevels.length > 0) {
      query = query.filter('target_level', 'ov', toPgArrayLiteral(selectedLevels))
    }
    if (selectedDurations.length > 0) {
      query = query.filter('target_duration', 'ov', toPgArrayLiteral(selectedDurations))
    }

    query = query.order('is_gold', { ascending: false }).order('updated_at', { ascending: false })

    const { data, error: queryError } = await query

    if (queryError) {
      setError(queryError.message)
    } else {
      setResults(data)
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '700px' }}>
      <h2>Търсене на кандидати</h2>

      <form onSubmit={handleSearch}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Предлагана нетна заплата (лв)</label>
          <input
            type="number"
            value={offeredSalary}
            onChange={(e) => setOfferedSalary(e.target.value)}
            placeholder="напр. 2000"
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Сектор (задръж Ctrl/Cmd за няколко)</label>
          <select multiple value={selectedSectors} onChange={handleMultiSelectChange(setSelectedSectors)}
            style={{ width: '100%', padding: '0.5rem', height: '150px' }}>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Град (задръж Ctrl/Cmd за няколко)</label>
          <select multiple value={selectedCities} onChange={handleMultiSelectChange(setSelectedCities)}
            style={{ width: '100%', padding: '0.5rem', height: '150px' }}>
            {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Ниво</label>
          {LEVEL_OPTIONS.map((level) => (
            <div key={level}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(level)}
                  onChange={(e) => handleCheckboxGroup(setSelectedLevels, selectedLevels, level, e.target.checked)}
                />
                {' '}{level}
              </label>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Заетост</label>
          {DURATION_OPTIONS.map((duration) => (
            <div key={duration}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedDurations.includes(duration)}
                  onChange={(e) => handleCheckboxGroup(setSelectedDurations, selectedDurations, duration, e.target.checked)}
                />
                {' '}{duration}
              </label>
            </div>
          ))}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Търся...' : 'Търси'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>Грешка: {error}</p>}

      {results !== null && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Намерени кандидати: {results.length}</h3>

          {results.length === 0 && (
            <p>Няма кандидати, отговарящи на тези критерии. Опитайте с по-висока заплата или по-малко филтри.</p>
          )}

          {results.map((c) => (
            <div key={c.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
              {c.is_gold && <span style={{ background: 'gold', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>ЗЛАТЕН</span>}
              <h4>{c.fname} {c.lname}</h4>
              <p>Град: {c.current_city}</p>
              <p>Желана заплата: {c.target_salary} лв</p>
              <p>Сектори: {(c.target_sector || []).join(', ')}</p>
              <p>Градове: {(c.target_cities || []).join(', ')}</p>
              <p>{c.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}