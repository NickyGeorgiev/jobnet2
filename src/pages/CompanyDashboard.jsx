import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { CheckoutButton } from './CheckoutButton'
import { StatusRing } from './StatusRing'
import './CompanyDashboard.css'

export function CompanyDashboard() {
  const { session } = useAuth()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStatus()
  }, [session])

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

  const isInTrial = company.trial_ends_at && new Date(company.trial_ends_at) > new Date()
  const hasPaidAccess = company.paid_until && new Date(company.paid_until) > new Date()
  const hasAnyAccess = isInTrial || hasPaidAccess

  const trialDaysLeft = isInTrial
    ? Math.round((new Date(company.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
    : 0
  const paidDaysLeft = hasPaidAccess
    ? Math.round((new Date(company.paid_until) - new Date()) / (1000 * 60 * 60 * 24))
    : 0

  const ringState = hasPaidAccess ? 'active' : isInTrial ? 'trial' : 'expired'

  const facts = [
    company.sector && { label: 'Сектор', value: company.sector },
    company.founded_year && { label: 'Основана', value: company.founded_year },
    company.employee_count && { label: 'Служители', value: company.employee_count },
    company.locations_count && { label: 'Обекти', value: company.locations_count },
  ].filter(Boolean)

  return (
    <div className="dashboard-shell">
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

      <div className="status-card" style={{ marginBottom: '1.5rem' }}>
        <div className="status-card-top">
          <StatusRing state={ringState} daysLeft={hasPaidAccess ? 0 : trialDaysLeft} />
          <div>
            {hasPaidAccess && (
              <>
                <span className="badge badge--success" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>Платен достъп</span>
                <p className="status-title">Търсенето е активно</p>
                <p className="status-sub">
                  Валидно до {new Date(company.paid_until).toLocaleDateString('bg-BG')} ({paidDaysLeft} {paidDaysLeft === 1 ? 'ден' : 'дни'})
                </p>
              </>
            )}
            {!hasPaidAccess && isInTrial && (
              <>
                <span className="badge badge--gold" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>Пробен период</span>
                <p className="status-title">Безплатен достъп</p>
                <p className="status-sub">Остават {trialDaysLeft} {trialDaysLeft === 1 ? 'ден' : 'дни'}.</p>
              </>
            )}
            {!hasAnyAccess && (
              <>
                <span className="badge badge--muted" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>Няма достъп</span>
                <p className="status-title">Търсенето е спряно</p>
                <p className="status-sub">Платете, за да продължите да търсите кандидати.</p>
              </>
            )}
          </div>
        </div>

        {!hasPaidAccess && (
          <div className="status-actions">
            <CheckoutButton
              priceId={import.meta.env.VITE_STRIPE_COMPANY_PRICE_ID}
              label="Плати за 30 дни — 29.99€"
            />
          </div>
        )}

        {hasPaidAccess && (
          <p className="status-sub" style={{ marginTop: '0.75rem' }}>
            Можете да платите отново за достъп, след изтичане на дните
          </p>
        )}
      </div>

      <div className="action-grid">
        <Link to="/company-profile" className="action-tile">
          <span className="action-tile-icon">✎</span>
          <div>
            <p className="action-tile-title">Редактирай профила</p>
            <p className="action-tile-sub">Лого, описание, контакти</p>
          </div>
        </Link>
        <Link to="/search" className="action-tile">
          <span className="action-tile-icon">🔍</span>
          <div>
            <p className="action-tile-title">Търси кандидати</p>
            <p className="action-tile-sub">Филтрирай по заплата, сектор, град</p>
          </div>
        </Link>
      </div>

      {(facts.length > 0 || company.bio || company.contact_phone || company.contact_email || company.contact_address) && (
        <div className="company-details">
          {facts.length > 0 && (
            <div className="facts-row">
              {facts.map((f) => (
                <div key={f.label}>
                  <span className="fact-value">{f.value}</span>
                  <span className="fact-label">{f.label}</span>
                </div>
              ))}
            </div>
          )}

          {company.bio && <p className="company-bio">{company.bio}</p>}

          {(company.contact_phone || company.contact_email || company.contact_address) && (
            <div className="contact-row">
              {company.contact_phone && <span>📞 {company.contact_phone}</span>}
              {company.contact_email && <span>✉ {company.contact_email}</span>}
              {company.contact_address && <span>📍 {company.contact_address}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}