import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { CheckoutButton } from './CheckoutButton'
import { StatusRing } from './StatusRing'
import { CvPaper } from './CvPaper'
import { CvModal } from './CvModal'
import './CandidateDashboard.css'

export function CandidateDashboard() {
  const { session } = useAuth()
  const [cv, setCv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCvModal, setShowCvModal] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)

  useEffect(() => {
    loadCv()
  }, [session])

  async function loadCv() {
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', session.user.id)
      .single()
    setCv(data)
    setLoading(false)
  }

  async function handleToggleActive() {
    setTogglingActive(true)
    const newActiveState = !cv.active

    const { error } = await supabase
      .from('candidates')
      .update({ active: newActiveState })
      .eq('id', session.user.id)

    if (!error) {
      setCv((prev) => ({ ...prev, active: newActiveState }))
    }
    setTogglingActive(false)
  }

  if (loading || !cv) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  const fullName = [cv.fname, cv.lname].filter(Boolean).join(' ') || 'Твоето име'

  const isCvComplete = cv.fname && cv.lname && cv.avatar_url && cv.target_salary &&
    cv.target_sector?.length > 0 && cv.target_cities?.length > 0

  const isGoldActive = cv.gold_until && new Date(cv.gold_until) > new Date()
  const goldDaysLeft = isGoldActive
    ? Math.round((new Date(cv.gold_until) - new Date()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        {cv.avatar_url ? (
          <img src={cv.avatar_url} alt="аватар" className="dashboard-logo" style={{ borderRadius: '50%' }} />
        ) : (
          <div className="dashboard-logo-placeholder" style={{ borderRadius: '50%' }}>
            {fullName[0]?.toUpperCase() || '👤'}
          </div>
        )}
        <div>
          <p className="dashboard-eyebrow">Кандидатски профил</p>
          <h1 className="dashboard-title">{fullName}</h1>
          <p className="dashboard-meta">{session?.user?.email}</p>
        </div>
      </div>

      <div className="status-card" style={{ marginBottom: '1.5rem' }}>
        <div className="toggle-row">
          <div>
            <p className="status-title" style={{ marginBottom: '0.2rem' }}>
              {cv.active ? '👁 Профилът е видим за фирмите' : '🙈 Профилът е скрит'}
            </p>
            <p className="status-sub">
              {cv.active
                ? 'Излизаш в резултатите на фирмите, търсещи по твоите критерии.'
                : 'Не се показваш никъде в търсенето — полезно, ако вече не търсиш работа.'}
            </p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={cv.active} onChange={handleToggleActive} disabled={togglingActive} />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="status-card" style={{ marginBottom: '1.5rem' }}>
        <div className="status-card-top">
          <StatusRing state={isGoldActive ? 'gold' : 'expired'} daysLeft={0} />
          <div>
            {isGoldActive ? (
              <>
                <span className="badge badge--gold" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>Gold статус</span>
                <p className="status-title">Излизаш най-отгоре</p>
                <p className="status-sub">
                  Валиден до {new Date(cv.gold_until).toLocaleDateString('bg-BG')} ({goldDaysLeft} {goldDaysLeft === 1 ? 'ден' : 'дни'})
                </p>
              </>
            ) : (
              <>
                <span className="badge badge--muted" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>Стандартен профил</span>
                <p className="status-title">Стани Gold кандидат</p>
                <p className="status-sub">9.99€ за 30 дни — CV-то ти излиза първо в резултатите.</p>
              </>
            )}
          </div>
        </div>

        {!isGoldActive && (
          <div className="status-actions">
            <CheckoutButton
              priceId={import.meta.env.VITE_STRIPE_GOLD_PRICE_ID}
              label="Стани Gold — 9.99€"
            />
          </div>
        )}

        {isGoldActive && (
          <p className="status-sub" style={{ marginTop: '0.75rem' }}>
            Можеш да платиш отново след 30 дни.
          </p>
        )}
      </div>
      <div className="status-card" style={{ marginBottom: '1.5rem' }}>
        <p className="status-title" style={{ marginBottom: '1rem' }}>Статистика на профила</p>
        <div className="facts-row">
          <div>
            <span className="fact-value">{cv.search_appearances || 0}</span>
            <span className="fact-label">Появявания в търсения</span>
          </div>
          <div>
            <span className="fact-value">{cv.profile_views || 0}</span>
            <span className="fact-label">Отворени подробности</span>
          </div>
        </div>
      </div>
      <div className="action-grid" style={{ marginBottom: '1.5rem' }}>
        <Link to="/my-cv" className="action-tile">
          <span className="action-tile-icon">✎</span>
          <div>
            <p className="action-tile-title">Редактирай CV</p>
            <p className="action-tile-sub">Обнови данни, опит, критерии</p>
          </div>
        </Link>
        <button
          onClick={() => setShowCvModal(true)}
          className="action-tile"
          style={{ width: '100%', border: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
        >
          <span className="action-tile-icon">👁</span>
          <div>
            <p className="action-tile-title">Виж CV</p>
            <p className="action-tile-sub">Как изглежда за фирмите</p>
          </div>
        </button>
      </div>

      {!isCvComplete && (
        <div className="status-card" style={{ marginBottom: '1.5rem', borderColor: 'var(--color-gold)' }}>
          <p className="status-title" style={{ marginBottom: '0.4rem' }}>CV-то ти не е напълно попълнено</p>
          <p className="status-sub" style={{ marginBottom: '1rem' }}>
            Липсват задължителни данни (снимка, заплата, сектори или градове) — фирмите няма да те виждат в търсенето, докато не ги допълниш.
          </p>
          <Link to="/my-cv" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Довърши CV-то
          </Link>
        </div>
      )}

      <CvPaper cv={cv} />

      <div className="match-strip">
        <p className="match-strip-heading">Критерии за търсене на работа</p>

        {cv.target_salary && (
          <div className="match-group">
            <p className="match-group-label">Желана заплата</p>
            <div className="tag-row">
              <span className="tag tag--salary">от {cv.target_salary} евро нетно</span>
            </div>
          </div>
        )}

        {cv.target_sector?.length > 0 && (
          <div className="match-group">
            <p className="match-group-label">Сектори в които търсите работа</p>
            <div className="tag-row">
              {cv.target_sector.map((s) => <span key={s} className="tag">{s}</span>)}
            </div>
          </div>
        )}

        {cv.target_cities?.length > 0 && (
          <div className="match-group">
            <p className="match-group-label">Градове в които търсите работа</p>
            <div className="tag-row">
              {cv.target_cities.map((c) => <span key={c} className="tag">{c}</span>)}
            </div>
          </div>
        )}

        {cv.target_level?.length > 0 && (
          <div className="match-group">
            <p className="match-group-label">Ниво в йерархията, което предпочитате</p>
            <div className="tag-row">
              {cv.target_level.map((l) => <span key={l} className="tag">{l}</span>)}
            </div>
          </div>
        )}

        {cv.target_duration?.length > 0 && (
          <div className="match-group">
            <p className="match-group-label">Вид заетост, който търсите</p>
            <div className="tag-row">
              {cv.target_duration.map((d) => <span key={d} className="tag">{d}</span>)}
            </div>
          </div>
        )}
      </div>

      {showCvModal && (
        <CvModal cv={cv} onClose={() => setShowCvModal(false)} showDownload={true} />
      )}
    </div>
  )
}