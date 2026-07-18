import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { StatusRing } from './StatusRing'
import { PlanPicker } from './PlanPicker'
import './CompanyDashboard.css'

export function CompanyDashboard() {
  const { session } = useAuth()
  const [company, setCompany] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState('')

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

    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', session.user.id)
      .maybeSingle()
    setSubscription(subData)

    setLoading(false)
  }

  async function handleCancel() {
    if (!confirm('Сигурни ли сте, че искате да отмените абонамента?')) return
    setCancelling(true)
    setMessage('')

    const { error } = await supabase.functions.invoke('cancel-subscription', {
      body: { type: 'company' },
    })

    if (error) {
      setMessage('Грешка: ' + error.message)
    } else {
      setMessage('Абонаментът е отменен. Ще остане активен до края на платения период.')
      loadStatus()
    }
    setCancelling(false)
  }

  if (loading || !company) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  const hasActiveSubscription = subscription && subscription.status === 'active'
  const isInTrial = company.trial_ends_at && new Date(company.trial_ends_at) > new Date()
  const hasPaidMonth = company.paid_until && new Date(company.paid_until) > new Date()
  const trialDaysLeft = isInTrial
    ? Math.round((new Date(company.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
    : 0

  const ringState = (hasActiveSubscription || hasPaidMonth) ? 'active' : isInTrial ? 'trial' : 'expired'
  const hasAnyAccess = hasActiveSubscription || isInTrial || hasPaidMonth

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

      <div className="dashboard-grid">
        <div className="status-card">
          <div className="status-card-top">
            <StatusRing state={ringState} daysLeft={trialDaysLeft} />
            <div>
              {hasActiveSubscription && (
                <>
                  <span className="badge badge--success" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>Активен абонамент</span>
                  {subscription.current_period_end && (
                    <p className="status-sub">
                      {subscription.cancel_at_period_end ? 'Ще спре на ' : 'Подновява се на '}
                      {new Date(subscription.current_period_end).toLocaleDateString('bg-BG')}
                    </p>
                  )}
                </>
              )}
              {!hasActiveSubscription && hasPaidMonth && (
                <span className="badge badge--success" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>Платен достъп</span>
              )}
              {!hasActiveSubscription && !hasPaidMonth && isInTrial && (
                <span className="badge badge--gold" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>Пробен период</span>
              )}
              {!hasAnyAccess && (
                <span className="badge badge--muted" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>Няма достъп</span>
              )}
            </div>
          </div>

          {hasActiveSubscription && (
            <div className="status-actions">
              {!subscription.cancel_at_period_end && (
                <button onClick={handleCancel} disabled={cancelling} className="btn-text-danger">
                  {cancelling ? 'Отменям...' : 'Отмени абонамент'}
                </button>
              )}
            </div>
          )}

          {!hasActiveSubscription && hasPaidMonth && (
            <>
              <p className="status-sub" style={{ marginBottom: '1rem' }}>
                Платено до {new Date(company.paid_until).toLocaleDateString('bg-BG')}. Месечният план не се подновява автоматично — плащаш пак, когато поискаш.
              </p>
              <PlanPicker />
            </>
          )}

          {!hasActiveSubscription && !hasPaidMonth && isInTrial && (
            <>
              <h3 style={{ marginBottom: '1rem' }}>🎁 Пробен период — остават {trialDaysLeft} {trialDaysLeft === 1 ? 'ден' : 'дни'}</h3>
              <PlanPicker />
            </>
          )}

          {!hasAnyAccess && (
            <>
              <h3 style={{ marginBottom: '1rem' }}>Достъпът е изтекъл</h3>
              <PlanPicker />
            </>
          )}

          {message && <p className="status-sub" style={{ marginTop: '0.75rem' }}>{message}</p>}
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