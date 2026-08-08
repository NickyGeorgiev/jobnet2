import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function AdminCompanies() {
  const [companies, setCompanies] = useState(null)

  function exportCsv() {
    const rows = companies.map(c => [
      c.company_name || '',
      c.bulstat || '',
      c.mol || '',
      c.contact_email || '',
      c.contact_phone || '',
      c.contact_address || '',
      c.sector || '',
      new Date(c.created_at).toLocaleDateString('bg-BG'),
    ])
    const csv = [['Име на фирма', 'Булстат', 'МОЛ на фирмата', 'Email', 'Телефон', 'Адрес', 'Сектор', 'Регистриран на'], ...rows]
      .map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'firmi.csv'
    link.click()
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false })
      setCompanies(data || [])
    }
    load()
  }, [])

  if (companies === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header" style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
        <div><p className="dashboard-eyebrow">Администрация</p><h1 className="dashboard-title">Всички фирми ({companies.length})</h1></div>
        <button className="btn-secondary" onClick={exportCsv}>⬇ Export CSV</button>
      </div>

      <div className="blog-admin-list">
        {companies.map((c) => {
          const isInTrial = c.trial_ends_at && new Date(c.trial_ends_at) > new Date()
          const isPaid = c.paid_until && new Date(c.paid_until) > new Date()
          return (
            <div key={c.id} className="blog-admin-row">
              <div>
                <p className="blog-admin-row-title">
                  {isPaid && <span className="blog-status-badge blog-status-badge--published">платено</span>}
                  {!isPaid && isInTrial && <span className="blog-status-badge blog-status-badge--draft">trial</span>}
                  {c.company_name || '(без име)'}
                </p>
                <p className="blog-admin-row-meta">{c.contact_email || '—'} · {c.sector || 'без сектор'} · рег. {new Date(c.created_at).toLocaleDateString('bg-BG')}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}