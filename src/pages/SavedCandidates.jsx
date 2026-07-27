import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { CvModal } from './CvModal'
import { MessageModal } from './MessageModal'
import { useDocumentTitle } from '../useDocumentTitle'
import './CompanySearch.css'

export function SavedCandidates() {
  useDocumentTitle('Запазени кандидати')
  const { session } = useAuth()
  const [saved, setSaved] = useState(null)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [messagingCandidate, setMessagingCandidate] = useState(null)

  useEffect(() => {
    loadSaved()
  }, [session])

  async function loadSaved() {
    const { data } = await supabase
      .from('saved_candidates')
      .select('candidate_id, candidates(*)')
      .eq('company_id', session.user.id)
      .order('created_at', { ascending: false })
    setSaved(data || [])
  }

  async function handleRemove(candidateId) {
    await supabase
      .from('saved_candidates')
      .delete()
      .eq('company_id', session.user.id)
      .eq('candidate_id', candidateId)
    loadSaved()
  }

  if (saved === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="search-shell">
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem' }}>Запазени кандидати</h2>

      {saved.length === 0 && (
        <div className="no-results">Все още нямаш запазени кандидати. Запазвай ги от резултатите в търсенето.</div>
      )}

      <div className="candidate-grid">
        {saved.map(({ candidate_id, candidates: c }) => {
          if (!c) return null
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
              <p className="candidate-card-salary">от {c.target_salary} €</p>

              <button className="candidate-card-btn" onClick={() => setSelectedCandidate(c)}>Виж подробности</button>
              <button
                className="candidate-card-btn"
                style={{ marginTop: '0.5rem', background: 'var(--color-gold-soft)', color: 'var(--color-gold)' }}
                onClick={() => setMessagingCandidate(c)}
              >
                ✉ Изпрати съобщение
              </button>
              <button className="candidate-card-btn" style={{ marginTop: '0.5rem', color: 'var(--color-danger)' }} onClick={() => handleRemove(c.id)}>
                ✕ Премахни от запазени
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