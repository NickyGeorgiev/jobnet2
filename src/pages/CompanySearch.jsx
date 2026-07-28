import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { sectors } from '../data/sectors'
import { allCities } from '../data/citiesByRegion'
import { CheckboxMultiSelect } from './CheckboxMultiSelect'
import { CvModal } from './CvModal'
import { Spinner } from './Spinner'
import { MessageModal } from './MessageModal'
import { useDocumentTitle } from '../useDocumentTitle'
import { CheckoutButton } from './CheckoutButton'
import { useFreeMode } from '../FreeModeContext'
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

function shuffleAll(data) {
  const arr = [...data]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function CompanySearch() {
  useDocumentTitle('Търсене на кандидати')
  const { session } = useAuth()
  const { freeMode, loaded: freeModeLoaded } = useFreeMode()
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
  const [messagingCandidate, setMessagingCandidate] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())

  async function handleViewDetails(candidate) {
    await supabase.rpc('increment_profile_view', { candidate_id: candidate.id })
    setSelectedCandidate(candidate)
  }

  useEffect(() => {
    async function checkAccess() {
      if (!freeModeLoaded) return

      if (freeMode) {
        setHasAccess(true)
        return
      }

      if (!session) {
        setHasAccess(false)
        return
      }

      try {
        const { data: companyData, error: queryError } = await supabase
          .from('companies')
          .select('trial_ends_at, paid_until')
          .eq('id', session.user.id)
          .single()

        if (queryError) {
          console.error('Грешка при проверка на достъпа:', queryError.message)
          setHasAccess(false)
          return
        }

        const isInTrial = Boolean(companyData?.trial_ends_at && new Date(companyData.trial_ends_at) > new Date())
        const hasPaidMonth = Boolean(companyData?.paid_until && new Date(companyData.paid_until) > new Date())

        setHasAccess(isInTrial || hasPaidMonth)
      } catch (err) {
        console.error('Неочаквана грешка при проверка на достъпа:', err)
        setHasAccess(false)
      }
    }
    checkAccess()
  }, [session, freeMode, freeModeLoaded])

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

    if (!freeMode) {
      query = query.order('is_gold', { ascending: false })
    }

    const { data, error: queryError } = await query

    if (queryError) {
      setError(queryError.message)
    } else {
      setResults(freeMode ? shuffleAll(data) : shuffleNonGold(data))
      if (data.length > 0) {
        await supabase.rpc('increment_search_appearances', { candidate_ids: data.map((c) => c.id) })
      }
      await supabase.rpc('log_search', {
        p_sectors: selectedSectors,
        p_cities: selectedCities,
        p_levels: selectedLevels,
        p_durations: selectedDurations,
        p_salary: parseInt(offeredSalary),
        p_results_count: data.length,
      })
    }
    setLoading(false)
  }

  function backToSearch() {
    setResults(null)
  }

  if (hasAccess === null) {
    return <Spinner label="Проверявам достъпа..." />
  }

  if (!hasAccess) {
    return (
      <div className="search-shell" style={{ maxWidth: '500px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Търсене на кандидати</h2>
        <div className="status-card" style={{ borderColor: 'var(--color-gold)' }}>
          <h3 className="status-title">Нямате достъп до търсенето</h3>
          <p className="status-sub" style={{ marginBottom: '1.25rem' }}>
            Пробният период е изтекъл или все още нямате платен достъп. Платете 29.99€ за 30 дни достъп, за да продължите да търсите кандидати.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <CheckoutButton
              priceId={import.meta.env.VITE_STRIPE_COMPANY_PRICE_ID}
              label="Плати за 30 дни — 29.99€"
            />
            <Link to="/" className="btn-secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Обратно към началото
            </Link>
          </div>
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
            const showGold = c.is_gold && !freeMode
            return (
              <div key={c.id} className={`candidate-card ${showGold ? 'candidate-card--gold' : ''}`}>
                {showGold && <span className="candidate-gold-ribbon">GOLD</span>}

                {c.avatar_url ? (
                  <img src={c.avatar_url} alt={fullName} className="candidate-card-avatar" />
                ) : (
                  <div className="candidate-card-avatar-placeholder">{fullName[0]?.toUpperCase() || '👤'}</div>
                )}

                <h3 className="candidate-card-name">{fullName}</h3>
                {c.contact_email && <p className="candidate-card-detail">{c.contact_email}</p>}
                {c.phone && <p className="candidate-card-detail">{c.phone}</p>}

                <p className="candidate-card-salary">от {c.target_salary} €</p>

                <button className="candidate-card-btn" onClick={() => handleViewDetails(c)}>
                  Виж подробности
                </button>
                <button
                  className="candidate-card-btn"
                  style={{ marginTop: '0.5rem', background: 'var(--color-gold-soft)', color: 'var(--color-gold)' }}
                  onClick={() => setMessagingCandidate(c)}
                >
                  ✉ Изпрати съобщение
                </button>
                <button
                  className="candidate-card-btn"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => handleToggleSave(c.id)}
                >
                  {savedIds.has(c.id) ? '★ Запазен' : '☆ Запази'}
                </button>
              </div>
            )
          })}
        </div>

        {selectedCandidate && (
          <CvModal cv={selectedCandidate} onClose={() => setSelectedCandidate(null)} showDownload={false} />
        )}
        {messagingCandidate && (
          <MessageModal candidate={messagingCandidate} onClose={() => setMessagingCandidate(null)} />
        )}
      </div>
    )
  }
  async function handleToggleSave(candidateId) {
    if (savedIds.has(candidateId)) {
      await supabase
        .from('saved_candidates')
        .delete()
        .eq('company_id', session.user.id)
        .eq('candidate_id', candidateId)
      setSavedIds((prev) => {
        const next = new Set(prev)
        next.delete(candidateId)
        return next
      })
    } else {
      await supabase
        .from('saved_candidates')
        .insert({ company_id: session.user.id, candidate_id: candidateId })
      setSavedIds((prev) => new Set(prev).add(candidateId))
    }
  }
  // --- Изгледът с формата за търсене ---
  return (
    <div className="search-shell" style={{ maxWidth: '700px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Търсене на кандидати</h2>
      <p className="search-welcome">
        Задай критерии — заплатата е задължителна, останалите стесняват резултата.
      </p>

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
            label="В кой сектор/и търсите служител?"
            options={sectors}
            selected={selectedSectors}
            onChange={setSelectedSectors}
          />

          <CheckboxMultiSelect
            label="За кой град/ове търсите служител?"
            options={allCities}
            selected={selectedCities}
            onChange={setSelectedCities}
          />

          <div className="checkbox-group">
            <label className="checkbox-group-label">За какво ниво/а в йерархията търсите служител?</label>
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
            <label className="checkbox-group-label">За какъв вид заетост търсите служител?</label>
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
            {loading ? 'Търся...' : 'Търси съвпадения'}
          </button>
        </form>
      </div>
    </div>
  )
}