import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { CvModal } from './CvModal'
import { MessageModal } from './MessageModal'
import { useSeo } from '../useSeo'
import { seo } from '../seo'
import './CompanySearch.css'
import './SavedCandidates.css'

function CandidateAvatar({ c, fullName }) {
  return c.avatar_url ? (
    <img src={c.avatar_url} alt={fullName} className="candidate-card-avatar" />
  ) : (
    <div className="candidate-card-avatar-placeholder">{fullName[0]?.toUpperCase() || '👤'}</div>
  )
}

export function SavedCandidates() {
  useSeo(seo.savedCandidates)
  const { session } = useAuth()
  const [saved, setSaved] = useState(null)
  const [approved, setApproved] = useState(null)
  const [chosenTab, setChosenTab] = useState(null)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [messagingCandidate, setMessagingCandidate] = useState(null)

  async function loadData() {
    const [savedRes, approvedRes] = await Promise.all([
      supabase
        .from('saved_candidates')
        .select('candidate_id, candidates(*)')
        .eq('company_id', session.user.id)
        .order('created_at', { ascending: false }),
      // Одобрените кандидати от всички обяви на фирмата
      supabase
        .from('job_applications')
        .select('id, created_at, job_listings!inner(id, title, company_id), candidates(*)')
        .eq('status', 'approved')
        .eq('job_listings.company_id', session.user.id)
        .order('created_at', { ascending: false }),
    ])
    setSaved(savedRes.data || [])
    setApproved(approvedRes.data || [])
  }

  useEffect(() => {
    loadData()
  }, [session])

  async function handleRemove(candidateId) {
    await supabase
      .from('saved_candidates')
      .delete()
      .eq('company_id', session.user.id)
      .eq('candidate_id', candidateId)
    const { data } = await supabase
      .from('saved_candidates')
      .select('candidate_id, candidates(*)')
      .eq('company_id', session.user.id)
      .order('created_at', { ascending: false })
    setSaved(data || [])
  }

  if (saved === null || approved === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  // Табът „Запазени“ се вижда само ако има запазени кандидати
  const hasSaved = saved.length > 0
  let tab = 'approved'
  if (hasSaved) {
    if (chosenTab) tab = chosenTab
    else if (approved.length === 0) tab = 'saved'
  }

  return (
    <div className="search-shell">
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem' }}>Кандидати</h2>

      {hasSaved && (
        <div className="candidates-tabs">
          <button
            type="button"
            className={`candidates-tab${tab === 'approved' ? ' candidates-tab--active' : ''}`}
            onClick={() => setChosenTab('approved')}
          >
            Одобрени ({approved.length})
          </button>
          <button
            type="button"
            className={`candidates-tab${tab === 'saved' ? ' candidates-tab--active' : ''}`}
            onClick={() => setChosenTab('saved')}
          >
            Запазени ({saved.length})
          </button>
        </div>
      )}

      {tab === 'approved' && (
        <>
          {approved.length === 0 && (
            <div className="no-results">
              Все още нямаш одобрени кандидати. Одобрявай кандидати от списъка с кандидатствалите във всяка обява.
              <div style={{ marginTop: '1rem' }}>
                <Link to="/company-jobs" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  Към моите обяви
                </Link>
              </div>
            </div>
          )}

          <div className="candidate-grid">
            {approved.map((app) => {
              const c = app.candidates
              if (!c) return null
              const fullName = [c.fname, c.lname].filter(Boolean).join(' ') || 'Кандидат'
              const appliedDate = new Date(app.created_at).toLocaleDateString('bg-BG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })

              return (
                <div key={app.id} className="candidate-card">
                  <CandidateAvatar c={c} fullName={fullName} />

                  <h3 className="candidate-card-name">{fullName}</h3>
                  {c.contact_email && <p className="candidate-card-detail">{c.contact_email}</p>}
                  <p className="candidate-card-job">
                    Одобрен за: <strong style={{color:'var(--color-teal)', fontSize:'1rem',}}>{app.job_listings?.title}</strong>
                  </p>
                  <p className="candidate-card-job">Кандидатствал на {appliedDate}</p>

                  <button className="candidate-card-btn" onClick={() => setSelectedCandidate(c)}>
                    Виж подробности
                  </button>
                  <button
                    className="candidate-card-btn"
                    style={{ marginTop: '0.5rem', background: 'var(--color-gold-soft)', color: 'var(--color-gold)' }}
                    onClick={() => setMessagingCandidate(c)}
                  >
                    ✉ Изпрати съобщение
                  </button>
                  <Link
                    to={`/company-jobs/${app.job_listings?.id}/applicants`}
                    className="candidate-card-btn"
                    style={{ marginTop: '0.5rem', display: 'block', textAlign: 'center', textDecoration: 'none' }}
                  >
                    Към обявата
                  </Link>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div className="candidate-grid">
          {saved.map(({ candidate_id, candidates: c }) => {
            if (!c) return null
            const fullName = [c.fname, c.lname].filter(Boolean).join(' ') || 'Кандидат'
            return (
              <div key={candidate_id} className="candidate-card">
                <CandidateAvatar c={c} fullName={fullName} />

                <h3 className="candidate-card-name">{fullName}</h3>
                {c.contact_email && <p className="candidate-card-detail">{c.contact_email}</p>}
                <p className="candidate-card-salary">от {c.target_salary} €</p>

                <button
                  className="candidate-card-btn"
                  onClick={async () => {
                    try {
                      await supabase.rpc('notify_cv_viewed', { p_candidate_id: c.id })
                    } catch (err) {
                      console.error('Failed to send CV view notification:', err)
                    }
                    setSelectedCandidate(c)
                  }}
                >
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
                  style={{ marginTop: '0.5rem', color: 'var(--color-danger)' }}
                  onClick={() => handleRemove(c.id)}
                >
                  ✕ Премахни от запазени
                </button>
              </div>
            )
          })}
        </div>
      )}

      {selectedCandidate && (
        <CvModal cv={selectedCandidate} onClose={() => setSelectedCandidate(null)} showDownload={false} />
      )}
      {messagingCandidate && (
        <MessageModal candidate={messagingCandidate} onClose={() => setMessagingCandidate(null)} />
      )}
    </div>
  )
}
