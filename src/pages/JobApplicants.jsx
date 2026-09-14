import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { CvModal } from './CvModal'
import { Spinner } from './Spinner'
import './CompanySearch.css'

const STATUS_LABEL = {
  submitted: 'Нова',
  viewed: 'Разгледана',
  approved: 'Одобрена',
  rejected: 'Отхвърлена',
}

export function JobApplicants() {
  const { id } = useParams()
  const { session } = useAuth()

  const [job, setJob] = useState(null)
  const [applications, setApplications] = useState(null)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [session, id])

  async function loadData() {
    if (!session) return

    const { data: jobData } = await supabase
      .from('job_listings')
      .select('id, title')
      .eq('id', id)
      .eq('company_id', session.user.id)
      .single()

    setJob(jobData)

    if (jobData) {
      const { data: apps } = await supabase
        .from('job_applications')
        .select('id, message, status, created_at, candidates(*)')
        .eq('job_listing_id', id)
        .order('created_at', { ascending: false })
      setApplications(apps || [])
    }

    setLoading(false)
  }

  async function handleStatusChange(appId, newStatus) {
    const { error } = await supabase.from('job_applications').update({ status: newStatus }).eq('id', appId)
    if (!error) {
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)))
    }
  }

  if (loading) return <Spinner label="Зареждане..." />

  if (!job) {
    return (
      <div className="dashboard-shell">
        <p style={{ color: 'var(--color-text-muted)' }}>
          Обявата не е намерена, или не е твоя.
        </p>
        <Link to="/company-jobs" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '1rem' }}>
          Обратно към обявите
        </Link>
      </div>
    )
  }

  return (
    <div className="search-shell">
      <Link to="/company-jobs" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        ← Обратно към обявите
      </Link>

      <h2 style={{ fontFamily: 'var(--font-display)', marginTop: '0.75rem', marginBottom: '1.5rem' }}>
        Кандидати за &bdquo;{job.title}&ldquo;
      </h2>

      {applications.length === 0 && (
        <div className="no-results">Все още няма кандидатствали за тази обява.</div>
      )}

      <div className="candidate-grid">
        {applications.map((app) => {
          const c = app.candidates
          if (!c) return null
          const fullName = [c.fname, c.lname].filter(Boolean).join(' ') || 'Кандидат'
          const appliedDate = new Date(app.created_at).toLocaleDateString('bg-BG', {
            day: 'numeric', month: 'long', year: 'numeric',
          })

          return (
            <div key={app.id} className={`candidate-card ${c.is_gold ? 'candidate-card--gold' : ''}`}>
              {c.is_gold && <span className="candidate-gold-ribbon">GOLD</span>}

              {c.avatar_url ? (
                <img src={c.avatar_url} alt={fullName} className="candidate-card-avatar" />
              ) : (
                <div className="candidate-card-avatar-placeholder">{fullName[0]?.toUpperCase() || '👤'}</div>
              )}

              <h3 className="candidate-card-name">{fullName}</h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  background:
                    app.status === 'approved' ? 'rgba(111, 207, 151, 0.15)' :
                    app.status === 'rejected' ? 'rgba(226, 114, 91, 0.15)' :
                    'var(--color-surface-raised)',
                  color:
                    app.status === 'approved' ? 'var(--color-success)' :
                    app.status === 'rejected' ? 'var(--color-danger)' :
                    'var(--color-text-muted)',
                }}
              >
                {STATUS_LABEL[app.status] || app.status}
              </span>
              {c.contact_email && <p className="candidate-card-detail">{c.contact_email}</p>}
              <p className="candidate-card-detail" style={{ fontSize: '0.78rem' }}>
                Кандидатствал на {appliedDate}
              </p>

              {app.message && (
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '0.5rem',
                    padding: '0.6rem',
                    background: 'var(--color-surface-raised)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {app.message}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <button
                  className="candidate-card-btn"
                  onClick={async () => {
                    if (app.status === 'submitted') {
                      handleStatusChange(app.id, 'viewed')
                    }
                    try {
                      await supabase.rpc('notify_cv_viewed', { p_candidate_id: c.id })
                    } catch (err) {
                      console.error('Failed to send CV view notification:', err)
                    }
                    setSelectedCandidate(c)
                  }}
                >
                  Виж CV
                </button>
                {app.status !== 'approved' && (
                  <button className="btn-secondary" onClick={() => handleStatusChange(app.id, 'approved')}>
                    Одобри
                  </button>
                )}
                {app.status !== 'rejected' && (
                  <button className="btn-text-danger" onClick={() => handleStatusChange(app.id, 'rejected')}>
                    Отхвърли
                  </button>
                )}
              </div>
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
