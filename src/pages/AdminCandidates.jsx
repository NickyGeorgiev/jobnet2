import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { CvModal } from './CvModal'
import { calculateCvCompleteness } from '../cvCompleteness'

export function AdminCandidates() {
  const [candidates, setCandidates] = useState(null)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  function exportCsv() {
    const rows = candidates.map(c => [
      [c.fname, c.lname].filter(Boolean).join(' '),
      c.contact_email || '',
      c.phone || '',
      c.current_city || '',
      c.target_salary || '',
      c.target_sector || '',
      c.target_cities || '',
      c.target_level || '',
      new Date(c.created_at).toLocaleDateString('bg-BG'),
    ])
    const csv = [['Име', 'Email', 'Телефон', 'Град', 'Желана заплата', 'Желан сектор', 'Желан град', 'Желано ниво', 'Регистриран на'], ...rows]
      .map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'kandidati.csv'
    link.click()
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('candidates').select('*').order('created_at', { ascending: false })
      setCandidates(data || [])
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!candidates) return null
    const q = search.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter((c) => {
      const fullName = [c.fname, c.lname].filter(Boolean).join(' ').toLowerCase()
      return (
        fullName.includes(q) ||
        (c.contact_email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      )
    })
  }, [candidates, search])

  if (candidates === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header" style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
        <div><p className="dashboard-eyebrow">Администрация</p><h1 className="dashboard-title">Всички кандидати ({filtered.length}{filtered.length !== candidates.length ? ` от ${candidates.length}` : ''})</h1></div>
        <button className="btn-secondary" onClick={exportCsv}>⬇ Export CSV</button>
      </div>

      <input
        type="text"
        className="admin-search-input"
        placeholder="Търси по име, имейл или телефон..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="blog-admin-list">
        {filtered.map((c) => {
          const { percent } = calculateCvCompleteness(c)
          const fullName = [c.fname, c.lname].filter(Boolean).join(' ') || '(без име)'
          return (
            <div key={c.id} className="blog-admin-row">
              <div>
                <p className="blog-admin-row-title">
                  {!c.active && <span className="blog-status-badge blog-status-badge--draft">скрит</span>}
                  {fullName}
                </p>
                <p className="blog-admin-row-meta">{c.contact_email || '—'} · {percent}% попълнено · рег. {new Date(c.created_at).toLocaleDateString('bg-BG')}</p>
                <p className="blog-admin-row-meta" style={{ marginTop: '0.3rem' }}>
                  {c.target_salary ? `от ${c.target_salary}€` : 'без заплата'} ·{' '}
                  {(c.target_sector || []).join(', ') || 'без сектор'} ·{' '}
                  {(c.target_cities || []).join(', ') || 'без град'}
                </p>
              </div>
              <button className="btn-secondary" onClick={() => setSelected(c)}>Виж CV</button>
            </div>
          )
        })}
        {filtered.length === 0 && <p style={{ color: 'var(--color-text-muted)', padding: '1rem 0' }}>Няма кандидати, отговарящи на търсенето.</p>}
      </div>

      {selected && <CvModal cv={selected} onClose={() => setSelected(null)} showDownload={false} />}
    </div>
  )
}
