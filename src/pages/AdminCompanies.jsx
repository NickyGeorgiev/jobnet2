import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function AdminCompanies() {
  const [companies, setCompanies] = useState(null)
  const [selected, setSelected] = useState(null)

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
              <button className="btn-secondary" onClick={() => setSelected(c)}>Виж профил</button>
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="cv-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="cv-modal-inner" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="cv-modal-actions">
              <button className="cv-modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="company-details" style={{ marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                {selected.logo_url ? (
                  <img src={selected.logo_url} alt={selected.company_name} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'contain', background: '#fff', padding: '0.3rem' }} />
                ) : (
                  <div className="company-directory-logo-placeholder" style={{ margin: 0 }}>🏢</div>
                )}
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>{selected.company_name}</h3>
              </div>

              <div className="facts-row">
                {selected.sector && <div><span className="fact-value">{selected.sector}</span><span className="fact-label">Сектор</span></div>}
                {selected.founded_year && <div><span className="fact-value">{selected.founded_year}</span><span className="fact-label">Основана</span></div>}
                {selected.employee_count && <div><span className="fact-value">{selected.employee_count}</span><span className="fact-label">Служители</span></div>}
                {selected.locations_count && <div><span className="fact-value">{selected.locations_count}</span><span className="fact-label">Обекти</span></div>}
              </div>

              {selected.bio && <p className="company-bio" style={{ marginTop: '1.5rem' }}>{selected.bio}</p>}

              {(selected.contact_phone || selected.contact_email || selected.contact_address) && (
                <div className="contact-row" style={{ marginTop: '1rem' }}>
                  {selected.contact_phone && <span>📞 {selected.contact_phone}</span>}
                  {selected.contact_email && <span>✉ {selected.contact_email}</span>}
                  {selected.contact_address && <span>📍 {selected.contact_address}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}