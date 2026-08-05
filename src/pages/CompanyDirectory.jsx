import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useSeo } from '../useSeo'
import { seo } from '../seo'
import './CompanyDirectory.css'

export function CompanyDirectory() {
  useSeo(seo.companies)
  const [companies, setCompanies] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function loadCompanies() {
      const { data } = await supabase
        .from('company_directory')
        .select('*')
        .order('company_name')
      setCompanies(data || [])
    }
    loadCompanies()
  }, [])

  if (companies === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="search-shell">
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Регистрирани фирми</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>Фирми, които вече използват Jobstate за намиране на кандидати.</p>

      {companies.length === 0 && (
        <div className="no-results">Все още няма регистрирани фирми с попълнен профил.</div>
      )}

      <div className="company-directory-grid">
        {companies.map((c) => (
          <div key={c.id} className="company-directory-card" onClick={() => setSelected(c)}>
            {c.logo_url ? (
              <img src={c.logo_url} alt={c.company_name} className="company-directory-logo" />
            ) : (
              <div className="company-directory-logo-placeholder">🏢</div>
            )}
            <h3 className="company-directory-name">{c.company_name}</h3>
            {c.sector && <p className="company-directory-sector">{c.sector}</p>}
          </div>
        ))}
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}