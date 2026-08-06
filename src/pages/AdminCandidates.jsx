import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { CvModal } from './CvModal'
import { calculateCvCompleteness } from '../cvCompleteness'

export function AdminCandidates() {
  const [candidates, setCandidates] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('candidates').select('*').order('created_at', { ascending: false })
      setCandidates(data || [])
    }
    load()
  }, [])

  if (candidates === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header"><div><p className="dashboard-eyebrow">Администрация</p><h1 className="dashboard-title">Всички кандидати ({candidates.length})</h1></div></div>

      <div className="blog-admin-list">
        {candidates.map((c) => {
          const { percent } = calculateCvCompleteness(c)
          const fullName = [c.fname, c.lname].filter(Boolean).join(' ') || '(без име)'
          return (
            <div key={c.id} className="blog-admin-row">
              <div>
                <p className="blog-admin-row-title">
                  {c.is_gold && <span className="blog-status-badge blog-status-badge--published">GOLD</span>}
                  {!c.active && <span className="blog-status-badge blog-status-badge--draft">скрит</span>}
                  {fullName}
                </p>
                <p className="blog-admin-row-meta">{c.contact_email || '—'} · {percent}% попълнено · рег. {new Date(c.created_at).toLocaleDateString('bg-BG')}</p>
              </div>
              <button className="btn-secondary" onClick={() => setSelected(c)}>Виж CV</button>
            </div>
          )
        })}
      </div>

      {selected && <CvModal cv={selected} onClose={() => setSelected(null)} showDownload={false} />}
    </div>
  )
}