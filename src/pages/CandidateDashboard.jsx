import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { CvPaper } from './CvPaper'
import { CvModal } from './CvModal'
import { useToast } from './Toast'
import { calculateCvCompleteness } from '../cvCompleteness'
import { useSeo } from '../useSeo'
import { seo } from '../seo'
import { IoShareSocialOutline } from "react-icons/io5";
import { MdOutlineMarkEmailRead } from "react-icons/md";
import { TbMailOff } from "react-icons/tb";
import { FaRegEyeSlash } from "react-icons/fa";
import './CandidateDashboard.css'

export function CandidateDashboard() {
  useSeo(seo.candidateDashboard)
  const { session } = useAuth()
  const { showToast } = useToast()
  const [cv, setCv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCvModal, setShowCvModal] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)
  const [togglingNotifications, setTogglingNotifications] = useState(false)

  useEffect(() => {
    loadCv()
  }, [session?.user?.id])

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

  async function handleToggleNotifications() {
    setTogglingNotifications(true)
    const newState = !cv.notify_on_match

    const { error } = await supabase
      .from('candidates')
      .update({ notify_on_match: newState })
      .eq('id', session.user.id)

    if (!error) {
      setCv((prev) => ({ ...prev, notify_on_match: newState }))
    }
    setTogglingNotifications(false)
  }

  function handleCopyPublicLink() {
    const url = `${window.location.origin}/cv/${session.user.id}`
    navigator.clipboard.writeText(url)
    showToast('Линкът е копиран!', 'success')
  }

  if (loading || !cv) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  const fullName = [cv.fname, cv.lname].filter(Boolean).join(' ') || 'Твоето име'

  const { percent: completenessPercent, missing: missingFields } = calculateCvCompleteness(cv)

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

      <div className="status-card" style={{ marginBottom: '1rem' }}>
        <div className="toggle-row">
          <div>
            <p className="status-title" style={{ marginBottom: '0.2rem' }}>
              {cv.active ? ('👁 Профилът е видим за фирмите') 
              : 
              <>
              <FaRegEyeSlash style={{ marginRight: '6px'}}/>
              Профилът е скрит
              </>
              }
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

      <div className="status-card" style={{ marginBottom: '1rem' }}>
        <div className="toggle-row">
          <div>
            <p className="status-title" style={{ marginBottom: '0.2rem' }}>
              {cv.notify_on_match ? (
                <>
                  <MdOutlineMarkEmailRead style={{ marginRight: '6px', verticalAlign: '-2px' }} />
                  Получаваш имейли за подходящи обяви
                </>
              ) : (
                <>
                  <TbMailOff style={{ marginRight: '6px', verticalAlign: '-2px' }} />
                  Известията са изключени
                </>
              )}
            </p>
            <p className="status-sub">
              {cv.notify_on_match
                ? 'Пращаме ти имейл, когато се публикува обява, отговаряща на критериите ти.'
                : 'Няма да получаваш имейли за нови обяви, дори да съвпадат с критериите ти.'}
            </p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={cv.notify_on_match} onChange={handleToggleNotifications} disabled={togglingNotifications} />
            <span className="toggle-slider"></span>
          </label>
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
        <button
          onClick={handleCopyPublicLink}
          className="action-tile"
          style={{ width: '100%', border: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
        >
          <span className="action-tile-icon"><IoShareSocialOutline /></span>
          <div>
            <p className="action-tile-title">Сподели CV-то си</p>
            <p className="action-tile-sub">Копирай публичен линк</p>
          </div>
        </button>
      </div>

      {completenessPercent < 100 && (
        <div className="status-card" style={{ marginBottom: '1.5rem', borderColor: 'var(--color-gold)' }}>
          <p className="status-title" style={{ marginBottom: '0.2rem' }}>
            Профилът ти е {completenessPercent}% готов
          </p>
          <p className="status-sub">
            По-пълните профили получават повече внимание от фирмите.
          </p>

          <div className="completeness-bar-track">
            <div
              className="completeness-bar-fill"
              style={{
                width: `${completenessPercent}%`,
                background: completenessPercent < 50 ? 'var(--color-danger)' : completenessPercent < 80 ? 'var(--color-gold)' : 'var(--color-success)',
              }}
            />
          </div>

          {missingFields.length > 0 && (
            <>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Липсва:</p>
              <div className="completeness-missing-list" style={{ marginBottom: '1.25rem' }}>
                {missingFields.map((field) => (
                  <span key={field} className="completeness-missing-tag">{field}</span>
                ))}
              </div>
            </>
          )}

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
              <span className="tag tag--salary">минимум {cv.target_salary} € нетно</span>
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