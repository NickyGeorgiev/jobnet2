import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useSeo } from '../useSeo'
import { seo } from '../seo'
import './AdminDashboard.css'

const SETTING_LABELS = {
  'color-bg': 'color-bg: Фон на страницата',
  'color-surface': 'color-surface: Фон на карти/панели (status-card, action-tile, candidate-card)',
  'color-surface-raised': 'color-surface-raised: По-светла повърхност (плейсхолдър лого/аватар, tag фон)',
  'color-border': 'color-border: Рамки/разделители (карти, полета, hr линии)',
  'color-text': 'color-text: Основен текст',
  'color-text-muted': 'color-text-muted: Второстепенен текст (описания, labels, дати)',
  'color-gold': 'color-gold: Gold акцент',
  'color-gold-soft':'color-gold-soft: Полупрозрачен златен фон зад badge/tag за заплата',
  'color-teal': 'color-teal: Company/бизнес акцент (линкове, action-tile hover)',
  'color-teal-soft':'color-teal-soft: Полупрозрачен тюркоазен фон зад иконки/tag-ове',
  'color-danger': 'color-danger: Грешки/опасност',
  'color-success': 'color-success: Успех',
}

export function AdminDashboard() {
  useSeo(seo.adminDashboard)
  const [stats, setStats] = useState(null)
  const [freeMode, setFreeModeLocal] = useState(null)
  const [togglingFreeMode, setTogglingFreeMode] = useState(false)
  const [settings, setSettings] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [invoiceActivity, setInvoiceActivity] = useState(null)
  const [invoicePage, setInvoicePage] = useState(0)
  const [invoiceTotalCount, setInvoiceTotalCount] = useState(0)
  const INVOICE_PAGE_SIZE = 20

  useEffect(() => {
    loadStats()
    loadSettings()
    loadActivity()
    loadFreeMode()
  }, [])

  useEffect(() => {
    loadInvoiceActivity()
  }, [invoicePage])

  async function loadStats() {
    const now = new Date().toISOString()
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const [
      candidatesCount,
      companiesCount,
      companiesPaidCount,
      trialCount,
      monthPayments,
      allPayments,
      jobsPublishedCount,
      jobsAllCount,
      applicationsCount,
      applicationsMonthCount,
      jobTiers,
      applicationStatuses,
      companyBalances,
    ] = await Promise.all([
      supabase.from('candidates').select('*', { count: 'exact', head: true }),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('companies').select('*', { count: 'exact', head: true }).gt('paid_until', now),
      supabase.from('companies').select('*', { count: 'exact', head: true }).gt('trial_ends_at', now),
      supabase.from('payments').select('amount').gte('created_at', startOfMonth),
      supabase.from('payments').select('amount'),
      supabase.from('job_listings').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('job_listings').select('*', { count: 'exact', head: true }),
      supabase.from('job_applications').select('*', { count: 'exact', head: true }),
      supabase.from('job_applications').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
      supabase.from('job_listings').select('tier').eq('status', 'published'),
      supabase.from('job_applications').select('status'),
      supabase.from('companies').select('token_balance'),
    ])

    const tierBuckets = { free: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 }
      ; (jobTiers.data || []).forEach((j) => { tierBuckets[j.tier] = (tierBuckets[j.tier] || 0) + 1 })

    const appStatusBuckets = { submitted: 0, viewed: 0, approved: 0, rejected: 0 }
      ; (applicationStatuses.data || []).forEach((a) => { appStatusBuckets[a.status] = (appStatusBuckets[a.status] || 0) + 1 })

    const totalTokensOutstanding = (companyBalances.data || []).reduce((sum, c) => sum + (c.token_balance || 0), 0)

    const monthRevenue = (monthPayments.data || []).reduce((sum, p) => sum + Number(p.amount), 0)
    const totalRevenue = (allPayments.data || []).reduce((sum, p) => sum + Number(p.amount), 0)

    setStats({
      candidates: candidatesCount.count || 0,
      companies: companiesCount.count || 0,
      companiesPaid: companiesPaidCount.count || 0,
      trialing: trialCount.count || 0,
      monthRevenue,
      totalRevenue,
      jobsPublished: jobsPublishedCount.count || 0,
      jobsAll: jobsAllCount.count || 0,
      applications: applicationsCount.count || 0,
      applicationsMonth: applicationsMonthCount.count || 0,
      tierBuckets,
      appStatusBuckets,
      totalTokensOutstanding,
    })
  }

  async function loadFreeMode() {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'free_launch_mode')
      .single()
    setFreeModeLocal(data?.value === 'true')
  }

  async function handleToggleFreeMode() {
    setTogglingFreeMode(true)
    const newValue = !freeMode
    const { error } = await supabase
      .from('site_settings')
      .update({ value: newValue ? 'true' : 'false' })
      .eq('key', 'free_launch_mode')

    if (!error) {
      setFreeModeLocal(newValue)
    }
    setTogglingFreeMode(false)
  }

  const [activity, setActivity] = useState(null)

  async function loadInvoiceActivity() {
    const { data: events, count } = await supabase
      .from('invoice_events')
      .select('id, action, created_at, user_id, payments(description, amount, currency)', { count: 'exact' })
      .eq('user_type', 'company')
      .order('created_at', { ascending: false })
      .range(invoicePage * INVOICE_PAGE_SIZE, invoicePage * INVOICE_PAGE_SIZE + INVOICE_PAGE_SIZE - 1)

    const list = events || []
    const companyIds = [...new Set(list.map((e) => e.user_id))]

    let companiesById = {}
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, company_name')
        .in('id', companyIds)
      companiesById = Object.fromEntries((companies || []).map((c) => [c.id, c.company_name]))
    }

    setInvoiceActivity(list.map((e) => ({ ...e, companyName: companiesById[e.user_id] || 'Фирма' })))
    setInvoiceTotalCount(count || 0)
  }

  async function loadActivity() {
    const [searchLogs, viewLogs, msgLogs] = await Promise.all([
      supabase.from('search_logs').select('sectors, cities, salary'),
      supabase.from('profile_view_logs').select('id', { count: 'exact', head: true }),
      supabase.from('message_logs').select('id', { count: 'exact', head: true }),
    ])

    const allSearches = searchLogs.data || []

    // Броим честотата на всеки сектор/град сред всички търсения
    const sectorCounts = {}
    const cityCounts = {}
    allSearches.forEach((s) => {
      ; (s.sectors || []).forEach((sec) => { sectorCounts[sec] = (sectorCounts[sec] || 0) + 1 })
        ; (s.cities || []).forEach((c) => { cityCounts[c] = (cityCounts[c] || 0) + 1 })
    })

    const topSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const BUCKET_ORDER = ['<800€', '800-1200€', '1200-1600€', '1600-2000€', '2000-2500€', '2500€+']
    function bucketSalary(amount) {
      if (amount < 800) return '<800€'
      if (amount < 1200) return '800-1200€'
      if (amount < 1600) return '1200-1600€'
      if (amount < 2000) return '1600-2000€'
      if (amount < 2500) return '2000-2500€'
      return '2500€+'
    }

    const [candidateSalaries, companySalaries] = await Promise.all([
      supabase.from('candidates').select('target_salary').not('target_salary', 'is', null),
      supabase.from('search_logs').select('salary').not('salary', 'is', null),
    ])

    const candidateBuckets = {}
      ; (candidateSalaries.data || []).forEach((c) => {
        const b = bucketSalary(c.target_salary)
        candidateBuckets[b] = (candidateBuckets[b] || 0) + 1
      })
    const companyBuckets = {}
      ; (companySalaries.data || []).forEach((s) => {
        const b = bucketSalary(s.salary)
        companyBuckets[b] = (companyBuckets[b] || 0) + 1
      })

    const desiredSalaries = BUCKET_ORDER.map((b) => [b, candidateBuckets[b] || 0])
    const offeredSalaries = BUCKET_ORDER.map((b) => [b, companyBuckets[b] || 0])

    setActivity({
      totalSearches: allSearches.length,
      totalProfileViews: viewLogs.count || 0,
      totalMessages: msgLogs.count || 0,
      topSectors,
      topCities,
      desiredSalaries,
      offeredSalaries,
    })
  }

  async function loadSettings() {
    const { data } = await supabase.from('site_settings').select('*').order('key')
    setSettings(data || [])
  }

  function handleColorChange(key, value) {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)))
    // Мигновен преглед — прилагаме веднага върху документа, преди дори да сме запазили
    document.documentElement.style.setProperty(`--${key}`, value)
  }

  async function handleSaveTheme() {
    setSaving(true)
    setMessage('')

    for (const setting of settings) {
      await supabase
        .from('site_settings')
        .update({ value: setting.value, updated_at: new Date().toISOString() })
        .eq('key', setting.key)
    }

    setMessage('Темата е запазена — всички посетители ще я видят при следващо зареждане.')
    setSaving(false)
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Администрация</p>
          <h1 className="dashboard-title">Admin панел</h1>
        </div>
      </div>

      <div className="status-card" style={{ marginBottom: '2rem', borderColor: freeMode ? 'var(--color-teal)' : 'var(--color-border)' }}>
        <div className="toggle-row">
          <div>
            <p className="status-title" style={{ marginBottom: '0.2rem' }}>
              {freeMode ? '🎉 Безплатен launch период — активен' : '💳 Плащанията са включени'}
            </p>
            <p className="status-sub">
              {freeMode
                ? 'Company search е безплатен за всички потребители.'
                : 'Company search изисква плащане, както обичайно.'}
            </p>
          </div>
          {freeMode !== null && (
            <label className="toggle-switch">
              <input type="checkbox" checked={!freeMode} onChange={handleToggleFreeMode} disabled={togglingFreeMode} />
              <span className="toggle-slider"></span>
            </label>
          )}
        </div>
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '1rem' }}>Статистики</h2>

      {!stats ? (
        <p>Зареждане...</p>
      ) : (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <p className="admin-stat-value">{stats.candidates}</p>
            <p className="admin-stat-label">Регистрирани кандидати</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-value">{stats.companies}</p>
            <p className="admin-stat-label">Регистрирани фирми</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-value">{stats.companiesPaid}</p>
            <p className="admin-stat-label">Фирми с платен достъп</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-value">{stats.trialing}</p>
            <p className="admin-stat-label">Фирми в пробен период</p>
          </div>
          <div className="admin-stat-card" style={{ borderColor: 'var(--color-gold)' }}>
            <p className="admin-stat-value" style={{ color: 'var(--color-gold)' }}>{stats.monthRevenue.toFixed(2)}€</p>
            <p className="admin-stat-label">Приход този месец</p>
          </div>
          <div className="admin-stat-card" style={{ borderColor: 'var(--color-teal)' }}>
            <p className="admin-stat-value" style={{ color: 'var(--color-teal)' }}>{stats.totalRevenue.toFixed(2)}€</p>
            <p className="admin-stat-label">Общ приход (всички времена)</p>
          </div>
        </div>
      )}

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '1rem' }}>Обяви и кандидатствания</h2>

      {stats && (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <p className="admin-stat-value">{stats.jobsPublished}</p>
              <p className="admin-stat-label">Активни публикувани обяви</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-value">{stats.jobsAll}</p>
              <p className="admin-stat-label">Обяви общо (всички статуси)</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-value">{stats.applications}</p>
              <p className="admin-stat-label">Кандидатствания общо</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-value">{stats.applicationsMonth}</p>
              <p className="admin-stat-label">Кандидатствания този месец</p>
            </div>
            <div className="admin-stat-card" style={{ borderColor: 'var(--color-gold)' }}>
              <p className="admin-stat-value" style={{ color: 'var(--color-gold)' }}>{stats.totalTokensOutstanding}</p>
              <p className="admin-stat-label">State Credits в обращение</p>
            </div>
          </div>

          <div className="dashboard-grid" style={{ marginBottom: '2.5rem' }}>
            <div className="status-card">
              <p className="status-title" style={{ marginBottom: '1rem' }}>Обяви по ниво</p>
              <div className="top-list">
                <div className="top-list-row"><span>Безплатна</span><span className="top-list-count">{stats.tierBuckets.free}</span></div>
                <div className="top-list-row"><span>Silver</span><span className="top-list-count">{stats.tierBuckets.silver}</span></div>
                <div className="top-list-row"><span>Gold</span><span className="top-list-count">{stats.tierBuckets.gold}</span></div>
                <div className="top-list-row"><span>Platinum</span><span className="top-list-count">{stats.tierBuckets.platinum}</span></div>
                <div className="top-list-row"><span>Diamond</span><span className="top-list-count">{stats.tierBuckets.diamond}</span></div>
              </div>
            </div>

            <div className="status-card">
              <p className="status-title" style={{ marginBottom: '1rem' }}>Кандидатствания по статус</p>
              <div className="top-list">
                <div className="top-list-row"><span>Изпратени</span><span className="top-list-count">{stats.appStatusBuckets.submitted}</span></div>
                <div className="top-list-row"><span>Разгледани</span><span className="top-list-count">{stats.appStatusBuckets.viewed}</span></div>
                <div className="top-list-row"><span>Одобрени</span><span className="top-list-count">{stats.appStatusBuckets.approved}</span></div>
                <div className="top-list-row"><span>Отхвърлени</span><span className="top-list-count">{stats.appStatusBuckets.rejected}</span></div>
              </div>
            </div>
          </div>
        </>
      )}

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '1rem' }}>Активност на платформата</h2>

      {!activity ? (
        <p>Зареждане...</p>
      ) : (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <p className="admin-stat-value">{activity.totalSearches}</p>
              <p className="admin-stat-label">Направени търсения</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-value">{activity.totalProfileViews}</p>
              <p className="admin-stat-label">Отворени CV подробности</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-value">{activity.totalMessages}</p>
              <p className="admin-stat-label">Изпратени съобщения</p>
            </div>
          </div>

          <div className="dashboard-grid" style={{ marginBottom: '2.5rem' }}>
            <div className="status-card">
              <p className="status-title" style={{ marginBottom: '1rem' }}>Най-търсени сектори</p>
              <div className="top-list">
                {activity.topSectors.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Няма данни още.</p>}
                {activity.topSectors.map(([sector, count]) => (
                  <div key={sector} className="top-list-row">
                    <span>{sector}</span>
                    <span className="top-list-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="status-card">
              <p className="status-title" style={{ marginBottom: '1rem' }}>Най-търсени градове</p>
              <div className="top-list">
                {activity.topCities.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Няма данни още.</p>}
                {activity.topCities.map(([city, count]) => (
                  <div key={city} className="top-list-row">
                    <span>{city}</span>
                    <span className="top-list-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="dashboard-grid" style={{ marginBottom: '2.5rem' }}>
            <div className="status-card">
              <p className="status-title" style={{ marginBottom: '1rem' }}>Желани заплати (кандидати)</p>
              <div className="top-list">
                {activity.desiredSalaries.every(([, c]) => c === 0) && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Няма данни още.</p>}
                {activity.desiredSalaries.map(([bucket, count]) => (
                  <div key={bucket} className="top-list-row">
                    <span>{bucket}</span>
                    <span className="top-list-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="status-card">
              <p className="status-title" style={{ marginBottom: '1rem' }}>Търсени заплати (фирми)</p>
              <div className="top-list">
                {activity.offeredSalaries.every(([, c]) => c === 0) && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Няма данни още.</p>}
                {activity.offeredSalaries.map(([bucket, count]) => (
                  <div key={bucket} className="top-list-row">
                    <span>{bucket}</span>
                    <span className="top-list-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '1rem' }}>Фактурна активност (фирми)</h2>

      <div className="status-card" style={{ marginBottom: '1rem' }}>
        {invoiceActivity === null && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Зареждане...</p>}
        {invoiceActivity?.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Няма отваряни/изтегляни фактури още.</p>}
        {invoiceActivity?.map((e) => (
          <div key={e.id} className="top-list-row">
            <span>
              {e.action === 'download' && '⬇ '}
              {e.action === 'print' && '🖨 '}
              {e.action === 'view' && '👁 '}
              <strong>{e.companyName}</strong> — {e.payments?.description || 'фактура'}
              {e.payments?.amount != null && ` (${Number(e.payments.amount).toFixed(2)} ${e.payments.currency || 'EUR'})`}
            </span>
            <span className="top-list-count" style={{ fontWeight: 400, fontSize: '0.78rem' }}>
              {new Date(e.created_at).toLocaleString('bg-BG')}
            </span>
          </div>
        ))}
      </div>

      {invoiceTotalCount > INVOICE_PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem', alignItems: 'center' }}>
          <button className="btn-secondary" onClick={() => setInvoicePage((p) => p - 1)} disabled={invoicePage === 0}>
            ← Предишна
          </button>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Страница {invoicePage + 1} от {Math.ceil(invoiceTotalCount / INVOICE_PAGE_SIZE)}
          </span>
          <button
            className="btn-secondary"
            onClick={() => setInvoicePage((p) => p + 1)}
            disabled={(invoicePage + 1) * INVOICE_PAGE_SIZE >= invoiceTotalCount}
          >
            Следваща →
          </button>
        </div>
      )}

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '1rem' }}>Цветове на темата</h2>

      <div className="status-card">
        {settings.map((setting) => (
          <div key={setting.key} className="theme-editor-row">
            <span className="theme-editor-label">{SETTING_LABELS[setting.key] || setting.key}</span>
            <input
              type="color"
              className="theme-editor-swatch"
              value={setting.value}
              onChange={(e) => handleColorChange(setting.key, e.target.value)}
            />
          </div>
        ))}

        <button onClick={handleSaveTheme} disabled={saving} className="btn-primary" style={{ marginTop: '1.25rem' }}>
          {saving ? 'Запазвам...' : 'Запази промените в темата'}
        </button>
        {message && <p style={{ color: 'var(--color-success)', marginTop: '0.75rem' }}>{message}</p>}
      </div>
    </div>
  )
}