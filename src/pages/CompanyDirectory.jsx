import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useSeo } from '../useSeo'
import { seo } from '../seo'
import './CompanyDirectory.css'

export function CompanyDirectory() {
  useSeo(seo.companies)
  const [companies, setCompanies] = useState(null)

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
          <Link key={c.id} to={`/companies/${c.id}`} className="company-directory-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            {c.logo_url ? (
              <img src={c.logo_url} alt={c.company_name} className="company-directory-logo" />
            ) : (
              <div className="company-directory-logo-placeholder">🏢</div>
            )}
            <h3 className="company-directory-name">{c.company_name}</h3>
            {c.sector && <p className="company-directory-sector">{c.sector}</p>}
          </Link>
        ))}
      </div>
    </div>
  )
}