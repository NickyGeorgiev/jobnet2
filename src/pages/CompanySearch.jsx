import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { sectors } from '../data/sectors'
import { allCities } from '../data/citiesByRegion'
import { CheckboxMultiSelect } from './CheckboxMultiSelect'

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

function toPgArrayLiteral(arr) {
  const escaped = arr.map((v) => `"${v.replace(/"/g, '\\"')}"`)
  return `{${escaped.join(',')}}`
}

// Разбърква на случаен принцип (Fisher-Yates), но само редовете, които НЕ са gold —
// gold кандидатите остават най-отгоре, само редът помежду им и на останалите се случайности всеки път.
function shuffleNonGold(data) {
  const goldOnes = data.filter((c) => c.is_gold)
  const others = data.filter((c) => !c.is_gold)

  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[others[i], others[j]] = [others[j], others[i]]
  }

  return [...goldOnes, ...others]
}

export function CompanySearch() {
  const { session } = useAuth()
  const [hasAccess, setHasAccess] = useState(null)
  const [offeredSalary, setOfferedSalary] = useState('')
  const [selectedSectors, setSelectedSectors] = useState([])
  const [selectedCities, setSelectedCities] = useState([])
  const [selectedLevels, setSelectedLevels] = useState([])
  const [selectedDurations, setSelectedDurations] = useState([])
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkAccess() {
      if (!session) return

      const { data: companyData } = await supabase
        .from('companies')
        .select('trial_ends_at')
        .eq('id', session.user.id)
        .single()

      const isInTrial = companyData?.trial_ends_at && new Date(companyData.trial_ends_at) > new Date()

      const { data: subData } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('company_id', session.user.id)
        .maybeSingle()

      const hasActiveSub = subData?.status === 'active'

      setHasAccess(isInTrial || hasActiveSub)
    }
    checkAccess()
  }, [session])

  function handleCheckboxGroup(setter, currentValues, value, checked) {
    setter(checked ? [...currentValues, value] : currentValues.filter((v) => v !== value))
  }

  async function handleSearch(e) {
    e.preventDefault()
    setError('')

    if (!offeredSalary) {
      setError('Моля, въведете предлагана заплата — това е основният критерий за търсене.')
      return
    }

    setLoading(true)

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

    query = query.order('is_gold', { ascending: false })

    const { data, error: queryError } = await query

    if (queryError) {
      setError(queryError.message)
    } else {
      setResults(shuffleNonGold(data))
    }
    setLoading(false)
  }

  // Все още проверяваме достъпа
  if (hasAccess === null) {
    return <div style={{ padding: '2rem' }}>Зареждане...</div>
  }

  // Няма активен абонамент — не показваме формата изобщо
  if (!hasAccess) {
    return (
      <div style={{ padding: '2rem', maxWidth: '500px' }}>
        <h2>Търсене на кандидати</h2>
        <div style={{ border: '1px solid #f0ad4e', background: '#fff8e6', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Нямате активен абонамент</h3>
          <p>За да търсите кандидати, трябва да имате активен абонамент (30€/месец, с 14 дни безплатен пробен период).</p>
          <Link to="/">Отиди към началния екран за абониране</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '700px' }}>
      <h2>Търсене на кандидати</h2>

      <form onSubmit={handleSearch}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Предлагана нетна заплата (лв) *</label>
          <input
            type="number"
            value={offeredSalary}
            onChange={(e) => setOfferedSalary(e.target.value)}
            placeholder="напр. 2000"
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        <CheckboxMultiSelect
          label="Сектор"
          options={sectors}
          selected={selectedSectors}
          onChange={setSelectedSectors}
        />

        <CheckboxMultiSelect
          label="Град"
          options={allCities}
          selected={selectedCities}
          onChange={setSelectedCities}
        />

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
              {c.avatar_url && (
                <img src={c.avatar_url} alt="avatar"
                  style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '50%', float: 'right' }} />
              )}
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