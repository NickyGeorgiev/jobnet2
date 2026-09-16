import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'
import { useTierOptions } from '../useTierOptions'
import { BuyCreditsModal } from './BuyCreditsModal'
import './JobListings.css'

const JOBS_SITE_URL = import.meta.env.VITE_JOBS_SITE_URL || 'https://jobs.jobstate.net'

const PAGE_SIZE = 15

export function JobListingsManage() {
  const { session } = useAuth()
  const { showToast } = useToast()
  const dbTierOptions = useTierOptions()
  const TIER_OPTIONS = dbTierOptions || []
  const [allListings, setAllListings] = useState(null)
  const [upgradingId, setUpgradingId] = useState(null)
  const [page, setPage] = useState(0)
  const [sortBy, setSortBy] = useState('created_desc')

  const [tokenBalance, setTokenBalance] = useState(0)
  const [pendingUpgrade, setPendingUpgrade] = useState(null) // { job, tierInfo }
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState('card')
  const [confirmingUpgrade, setConfirmingUpgrade] = useState(false)
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false)

  const STATUS_PRIORITY = { published: 0, draft: 0, closed: 0, expired: 1 }

  const sortedListings = allListings
    ? [...allListings].sort((a, b) => {
      switch (sortBy) {
        case 'created_asc':
          return new Date(a.created_at) - new Date(b.created_at)
        case 'tier_desc':
          return (b.tier_rank || 0) - (a.tier_rank || 0)
        case 'tier_asc':
          return (a.tier_rank || 0) - (b.tier_rank || 0)
        case 'views_desc':
          return (b.view_count || 0) - (a.view_count || 0)
        case 'views_asc':
          return (a.view_count || 0) - (b.view_count || 0)
        case 'applications_desc':
          return b.applicationCount - a.applicationCount
        case 'applications_asc':
          return a.applicationCount - b.applicationCount
        case 'status':
          return (
            (STATUS_PRIORITY[a.status] ?? 0) - (STATUS_PRIORITY[b.status] ?? 0) ||
            new Date(b.created_at) - new Date(a.created_at)
          )
        case 'created_desc':
        default:
          return new Date(b.created_at) - new Date(a.created_at)
      }
    })
    : []

  const totalCount = sortedListings.length
  const listings = sortedListings.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  useEffect(() => {
    loadListings()
    loadTokenBalance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(0)
  }, [sortBy])

  async function loadListings() {
    const { data } = await supabase
      .from('job_listings')
      .select('*')
      .eq('company_id', session.user.id)

    const jobs = data || []
    const jobIds = jobs.map((j) => j.id)

    let applicationCounts = {}
    if (jobIds.length > 0) {
      const { data: apps } = await supabase
        .from('job_applications')
        .select('job_listing_id')
        .in('job_listing_id', jobIds)

      applicationCounts = (apps || []).reduce((acc, a) => {
        acc[a.job_listing_id] = (acc[a.job_listing_id] || 0) + 1
        return acc
      }, {})
    }

    setAllListings(jobs.map((j) => ({ ...j, applicationCount: applicationCounts[j.id] || 0 })))
  }

  async function loadTokenBalance() {
    if (!session) return
    const { data } = await supabase
      .from('companies')
      .select('token_balance')
      .eq('id', session.user.id)
      .single()
    setTokenBalance(data?.token_balance || 0)
  }

  async function handleCloseListing(id) {
    if (!confirm('Затваряне на обявата — вече няма да се показва публично. Продължи?')) return
    const { error } = await supabase
      .from('job_listings')
      .update({ status: 'closed' })
      .eq('id', id)
      .eq('company_id', session.user.id)
    if (error) {
      showToast('Грешка: ' + error.message, 'error')
    } else {
      showToast('Обявата е затворена', 'success')
      loadListings()
    }
  }

  async function handleDelete(id) {
    if (!confirm('Изтриване на обявата завинаги — включително всички кандидатствания по нея. Продължи?')) return
    const { error } = await supabase
      .from('job_listings')
      .delete()
      .eq('id', id)
      .eq('company_id', session.user.id)
    if (error) {
      showToast('Грешка: ' + error.message, 'error')
    } else {
      showToast('Обявата е изтрита', 'success')
      loadListings()
    }
  }

  async function handleDuplicate(job) {
    // eslint-disable-next-line no-unused-vars
    const { id, created_at, applicationCount, published_at, view_count, status, tier, tier_rank, slug, ...rest } = job
    const { error } = await supabase.from('job_listings').insert({
      ...rest,
      slug: null,
      company_id: session.user.id,
      status: 'draft',
    })
    if (error) {
      console.error('Duplicate error:', error)
      showToast('Грешка: ' + error.message, 'error')
    } else {
      showToast('Обявата е дублирана като чернова', 'success')
      loadListings()
    }
  }

  // Отваря избор на начин на плащане, вместо директно да пренасочва
  // към карта — точно както при първоначалното публикуване.
  function handleUpgradeTier(job, tierValue) {
    const tierInfo = TIER_OPTIONS.find((t) => t.value === tierValue)
    if (!tierInfo) return
    setUpgradePaymentMethod(tokenBalance >= tierInfo.price ? 'credits' : 'card')
    setPendingUpgrade({ job, tierInfo })
  }

  async function handleConfirmUpgrade() {
    if (!pendingUpgrade) return
    const { job, tierInfo } = pendingUpgrade

    if (upgradePaymentMethod === 'credits') {
      if (tokenBalance < tierInfo.price) {
        showToast('Нямаш достатъчно State Credits за това ниво.', 'error')
        return
      }

      setConfirmingUpgrade(true)
      const { error } = await supabase.rpc('redeem_tier_with_tokens', {
        p_job_id: job.id,
        p_tier: tierInfo.value,
      })
      setConfirmingUpgrade(false)

      if (error) {
        showToast('Грешка при плащане с кредити: ' + error.message, 'error')
        return
      }

      showToast(`Обявата е вдигната на ${tierInfo.label}!`, 'success')
      setPendingUpgrade(null)
      loadListings()
      loadTokenBalance()
    } else {
      setUpgradingId(job.id)
      const { data, error } = await supabase.functions.invoke(
        'create-checkout-session',
        { body: { priceId: tierInfo.priceId, metadata: { jobListingId: job.id } } }
      )
      setUpgradingId(null)

      if (error || !data?.url) {
        showToast('Грешка при стартиране на плащането.', 'error')
      } else {
        window.location.href = data.url
      }
    }
  }

  if (allListings === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  const statusLabel = { draft: 'Чернова', published: 'Публикувана', closed: 'Затворена', expired: 'Изтекла' }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header" style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
        <div>
          <p className="dashboard-eyebrow">Фирмен профил</p>
          <h1 className="dashboard-title">Моите обяви</h1>
        </div>
        <Link to="/company-jobs/new" className="btn-primary" style={{ textDecoration: 'none' }}>
          + Нова обява
        </Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <select className="input" style={{ width: 'auto' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="created_desc">Дата: нови → стари</option>
          <option value="created_asc">Дата: стари → нови</option>
          <option value="tier_desc">Ниво: високо → ниско</option>
          <option value="tier_asc">Ниво: ниско → високо</option>
          <option value="views_desc">Прегледи: най-много</option>
          <option value="views_asc">Прегледи: най-малко</option>
          <option value="applications_desc">Кандидатствания: най-много</option>
          <option value="applications_asc">Кандидатствания: най-малко</option>
          <option value="status">Активни → изтекли</option>
        </select>
      </div>
      <div className="blog-admin-list">
        {listings.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>Все още нямате създадени обяви.</p>}

        {listings.map((job) => (
          <div key={job.id} className={`job-admin-row ${job.status === 'expired' ? 'job-admin-row--expired' : ''}`}>
            <div>
              <p className="blog-admin-row-title">
                <span className={`blog-status-badge blog-status-badge--${job.status === 'published' ? 'published' : job.status === 'expired' ? 'closed' : 'draft'}`}>
                  {statusLabel[job.status]}
                </span>
                {job.title}
              </p>
              <p className="blog-admin-row-meta">
                гр: {job.city} / сектор: {job.sector} / заплата: {job.salary}{job.salary_max ? ` - ${job.salary_max}` : ''}€{!job.salary_visible && '/скрита'}
                {' / Ниво: '}
                {job.tier && job.tier !== 'free' ? (
                  (() => {
                    const tier = TIER_OPTIONS.find((t) => t.value === job.tier)

                    return tier ? (
                      <span className={`tier-badge tier-badge--${job.tier}`}>
                        {tier.icon} {tier.label}
                      </span>
                    ) : null
                  })()
                ) : (
                  'Безплатна'
                )}
                {job.status === 'published' && job.expires_at && (
                  <>
                    {' / Изтича на: '}
                    {new Date(job.expires_at).toLocaleDateString('bg-BG')}
                  </>
                )}
                <p className="blog-admin-row-meta" style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>
                  👁 {job.view_count || 0} {job.view_count === 1 ? 'преглед' : 'прегледа'} · 📩 {job.applicationCount} {job.applicationCount === 1 ? 'кандидатстване' : 'кандидатствания'}
                </p>
              </p>
            </div>
            <div className="job-listing-row-actions">
              {job.status === 'published' && job.tier !== 'diamond' && TIER_OPTIONS.length > 0 && (
                <select
                  className="input"
                  style={{ width: 'auto' }}
                  value=""
                  disabled={upgradingId === job.id}
                  onChange={(e) => e.target.value && handleUpgradeTier(job, e.target.value)}
                >
                  <option value="">{upgradingId === job.id ? 'Зареждане...' : 'Ъпгрейд ниво'}</option>
                  {TIER_OPTIONS.filter((t) => t.rank > (TIER_OPTIONS.find((x) => x.value === job.tier)?.rank || 0)).map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              )}
              {job.status === 'published' && (
                <a
                  href={`${JOBS_SITE_URL}/jobs/${job.slug}-${job.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ textDecoration: 'none' }}
                >
                  Виж
                </a>
              )}
              <Link to={`/company-jobs/${job.id}/applicants`} className="btn-secondary" style={{ textDecoration: 'none' }}>
                Кандидати
              </Link>
              <Link to={`/company-jobs/${job.id}`} className="btn-secondary" style={{ textDecoration: 'none' }}>
                Редактирай
              </Link>
              <button className="btn-secondary" onClick={() => handleDuplicate(job)}>
                Дублирай
              </button>
              {job.status === 'published' && (
                <button className="btn-text-danger" onClick={() => handleCloseListing(job.id)}>Затвори</button>
              )}
              <button className="btn-text-danger" onClick={() => handleDelete(job.id)}>Изтрий</button>
            </div>
          </div>
        ))}
      </div>

      {totalCount > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
          <button className="btn-secondary" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
            ← Предишна
          </button>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Страница {page + 1} от {Math.ceil(totalCount / PAGE_SIZE)}
          </span>
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= totalCount}
          >
            Следваща →
          </button>
        </div>
      )}

      {pendingUpgrade && (
        <div className="cv-modal-backdrop" onClick={() => !confirmingUpgrade && setPendingUpgrade(null)}>
          <div
            className="cv-modal-inner"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h3 style={{ marginTop: 0 }}>
                Ъпгрейд до {pendingUpgrade.tierInfo.label}
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                "{pendingUpgrade.job.title}"
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className={`btn-secondary ${upgradePaymentMethod === 'card' ? 'is-selected' : ''}`}
                  style={{
                    textAlign: 'left',
                    borderColor: upgradePaymentMethod === 'card' ? 'var(--color-teal)' : undefined,
                  }}
                  onClick={() => setUpgradePaymentMethod('card')}
                >
                  💳 Плати с карта — {pendingUpgrade.tierInfo.priceEur ?? pendingUpgrade.tierInfo.price} €
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    textAlign: 'left',
                    borderColor: upgradePaymentMethod === 'credits' ? 'var(--color-teal)' : undefined,
                    opacity: tokenBalance < pendingUpgrade.tierInfo.price ? 0.6 : 1,
                  }}
                  onClick={() => setUpgradePaymentMethod('credits')}
                >
                  🪙 Плати с State Credits — {pendingUpgrade.tierInfo.price} SC
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    Наличен баланс: {tokenBalance} SC
                  </span>
                </button>
              </div>

              {upgradePaymentMethod === 'credits' && tokenBalance < pendingUpgrade.tierInfo.price && (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-danger)', marginBottom: '1rem' }}>
                  Нямаш достатъчно кредити за това ниво.{' '}
                  <button
                    type="button"
                    onClick={() => setShowBuyCreditsModal(true)}
                    style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Купи бъндъл от тук
                  </button>
                  , или плати с карта.
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button className="btn-secondary" onClick={() => setPendingUpgrade(null)} disabled={confirmingUpgrade}>
                  Отказ
                </button>
                <button
                  className="btn-primary"
                  onClick={handleConfirmUpgrade}
                  disabled={confirmingUpgrade || (upgradePaymentMethod === 'credits' && tokenBalance < pendingUpgrade.tierInfo.price)}
                >
                  {confirmingUpgrade ? 'Обработва се...' : 'Потвърди'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBuyCreditsModal && (
        <BuyCreditsModal
          onClose={() => setShowBuyCreditsModal(false)}
          onBalanceUpdate={(newBalance) => setTokenBalance(newBalance)}
        />
      )}
    </div>
  )
}
