import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { useSeo } from '../useSeo'
import { seo } from '../seo'
import { GoChecklist } from "react-icons/go";
import { TbListSearch } from "react-icons/tb";
import { FaLocationDot } from "react-icons/fa6";
import { LuPhoneCall } from "react-icons/lu";
import './CompanyDashboard.css'

export function CompanyDashboard() {
  useSeo(seo.companyDashboard)
  const { session } = useAuth()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStatus()
  }, [session?.user?.id])

  async function loadStatus() {
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', session.user.id)
      .single()
    setCompany(companyData)
    setLoading(false)
  }

  if (loading || !company) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  const facts = [
    company.sector && { label: 'Сектор', value: company.sector },
    company.founded_year && { label: 'Основана', value: company.founded_year },
    company.employee_count && { label: 'Служители', value: company.employee_count },
    company.locations_count && { label: 'Обекти', value: company.locations_count },
  ].filter(Boolean)

  return (
    <div className="dashboard-shell">
      <div className="company-public-banner" style={company.banner_url ? { backgroundImage: `url(${company.banner_url})` } : undefined}>
        <div className="company-public-banner-overlay" />
      </div>
      <div className="dashboard-header">
        {company.logo_url ? (
          <img src={company.logo_url} alt="лого" className="dashboard-logo" />
        ) : (
          <div className="dashboard-logo-placeholder">
            {company.company_name ? company.company_name[0].toUpperCase() : '🏢'}
          </div>
        )}
        <div>
          <p className="dashboard-eyebrow">Фирмен профил</p>
          <h1 className="dashboard-title">{company.company_name || 'Нова фирма'}</h1>
          <p className="dashboard-meta">{session?.user?.email}</p>
        </div>
      </div>

      <div className="action-grid">
        <Link to={`/companies/${session.user.id}`} className="action-tile">
          <span className="action-tile-icon">👁</span>
          <div>
            <p className="action-tile-title">Виж публичния профил</p>
            <p className="action-tile-sub">Точно както го виждат кандидатите</p>
          </div>
        </Link>
        <Link to="/company-jobs" className="action-tile">
          <span className="action-tile-icon"><GoChecklist /></span>
          <div>
            <p className="action-tile-title">Моите обяви</p>
            <p className="action-tile-sub">Меню за администриране на обяви</p>
          </div>
        </Link>
        <Link to="/company-profile" className="action-tile">
          <span className="action-tile-icon">✎</span>
          <div>
            <p className="action-tile-title">Редактирай профила</p>
            <p className="action-tile-sub">Попълване на фирмени данни</p>
          </div>
        </Link>
        <Link to="/search" className="action-tile">
          <span className="action-tile-icon"><TbListSearch /></span>
          <div>
            <p className="action-tile-title">Търси кандидати</p>
            <p className="action-tile-sub">Филтрирай по заплата, сектор, град</p>
          </div>
        </Link>
      </div>

      {
        (facts.length > 0 || company.bio || company.contact_phone || company.contact_email || company.contact_address) && (
          <div className="company-details">
            {facts.length > 0 && (
              <div className="facts-row">
                {facts.map((f) => (
                  <div key={f.label}>
                    <span className="fact-label">{f.label}</span>
                    <span className="fact-value">{f.value}</span>
                  </div>
                ))}
              </div>
            )}

            {company.bio && <p className="company-bio">{company.bio}</p>}

            {(company.contact_phone || company.contact_email || company.contact_address) && (
              <div className="contact-row">
                {company.contact_phone && <span><LuPhoneCall /> {company.contact_phone}</span>}
                {company.contact_email && <span>✉ {company.contact_email}</span>}
                {company.contact_address && <span><FaLocationDot /> {company.contact_address}</span>}
              </div>
            )}
          </div>
        )
      }
    </div>
  )
}