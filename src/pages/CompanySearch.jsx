import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { sectors } from '../data/sectors'
import { allCities } from '../data/citiesByRegion'
import { CheckboxMultiSelect } from './CheckboxMultiSelect'
import { CvModal } from './CvModal'
import './CompanySearch.css'

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
  const [selectedCandidate, setSelectedCandidate] = useState(null)

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
      .lte('target_salary', parseInt(offeredSalary))

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

  function backToSearch() {
    setResults(null)
  }

  if (hasAccess === null) {
    return <div style={{ padding: '2rem' }}>Зареждане...</div>
  }

  if (!hasAccess) {
    return (
      <div className="search-shell" style={{ maxWidth: '500px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Търсене на кандидати</h2>
        <div className="status-card" style={{ borderColor: 'var(--color-gold)' }}>
          <h3 className="status-title">Нямате активен абонамент</h3>
          <p className="status-sub" style={{ marginBottom: '1rem' }}>
            За да търсите кандидати, трябва да имате активен абонамент (30€/месец) или неизтекъл пробен период.
          </p>
          <Link to="/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Към началния екран
          </Link>
        </div>
      </div>
    )
  }

  // --- Изгледът с резултати (grid визитки) ---
  if (results !== null) {
    return (
      <div className="search-shell">
        <div className="search-results-header">
          <h2 className="search-results-count">
            Намерени кандидати: <span>{results.length}</span>
          </h2>
          <button className="btn-secondary" onClick={backToSearch}>← Коригирай търсенето</button>
        </div>

        {results.length === 0 && (
          <div className="no-results">
            <p>Няма кандидати, отговарящи на тези критерии.</p>
            <p>Опитайте с по-висока заплата или други филтри.</p>
          </div>
        )}

        <div className="candidate-grid">
          {results.map((c) => {
            const fullName = [c.fname, c.lname].filter(Boolean).join(' ') || 'Кандидат'
            return (
              <div key={c.id} className={`candidate-card ${c.is_gold ? 'candidate-card--gold' : ''}`}>
                {c.is_gold && <span className="candidate-gold-ribbon">GOLD</span>}

                {c.avatar_url ? (
                  <img src={c.avatar_url} alt={fullName} className="candidate-card-avatar" />
                ) : (
                  <div className="candidate-card-avatar-placeholder">{fullName[0]?.toUpperCase() || '👤'}</div>
                )}

                <h3 className="candidate-card-name">{fullName}</h3>
                {c.contact_email && <p className="candidate-card-detail">{c.contact_email}</p>}
                {c.phone && <p className="candidate-card-detail">{c.phone}</p>}

                <p className="candidate-card-salary">от {c.target_salary} лв</p>

                <button className="candidate-card-btn" onClick={() => setSelectedCandidate(c)}>
                  Виж подробности
                </button>
              </div>
            )
          })}
        </div>

        {selectedCandidate && (
          <CvModal cv={selectedCandidate} onClose={() => setSelectedCandidate(null)} showDownload={false} />
        )}
      </div>
    )
  }

  // --- Изгледът с формата за търсене ---
  return (
    <div className="search-shell" style={{ maxWidth: '700px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem' }}>Търсене на кандидати</h2>

      <div className="search-form-card">
        <form onSubmit={handleSearch}>
          <div className="field">
            <label>Предлагана нетна заплата (€) *</label>
            <input
              type="number"
              className="input"
              value={offeredSalary}
              onChange={(e) => setOfferedSalary(e.target.value)}
              placeholder="напр. 2000"
              required
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

          <div className="checkbox-group">
            <label className="checkbox-group-label">Ниво</label>
            {LEVEL_OPTIONS.map((level) => (
              <label key={level} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(level)}
                  onChange={(e) => handleCheckboxGroup(setSelectedLevels, selectedLevels, level, e.target.checked)}
                />
                {level}
              </label>
            ))}
          </div>

          <div className="checkbox-group">
            <label className="checkbox-group-label">Заетост</label>
            {DURATION_OPTIONS.map((duration) => (
              <label key={duration} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedDurations.includes(duration)}
                  onChange={(e) => handleCheckboxGroup(setSelectedDurations, selectedDurations, duration, e.target.checked)}
                />
                {duration}
              </label>
            ))}
          </div>

          {error && <p style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Търся...' : 'Търси'}
          </button>
        </form>
      </div>
    </div>
  )
}