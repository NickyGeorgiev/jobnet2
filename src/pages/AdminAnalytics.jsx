import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const CHANNEL_LABELS = {
  Direct: 'Директен трафик', 'Organic Search': 'Органично търсене', Referral: 'Препратки от други сайтове',
  'Organic Social': 'Социални мрежи', 'Paid Social': 'Платени социални мрежи', 'Paid Search': 'Платено търсене',
  Email: 'Имейл', Affiliates: 'Партньори', Video: 'Видео', Display: 'Display реклама', Unassigned: 'Неопределен',
}

const DEVICE_LABELS = { desktop: 'Компютър', mobile: 'Телефон', tablet: 'Таблет' }

const EVENT_LABELS = {
  page_view: 'Преглед на страница', session_start: 'Начало на сесия', first_visit: 'Първо посещение',
  user_engagement: 'Ангажираност', scroll: 'Превъртане', click: 'Клик', view_search_results: 'Търсене',
  login: 'Вход', sign_up: 'Регистрация',
}

const JOB_TIER_LABELS = { free: 'Безплатна', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', diamond: 'Diamond' }
const JOB_STATUS_LABELS = { draft: 'Чернова', published: 'Публикувана', closed: 'Затворена', expired: 'Изтекла' }
const APPLICATION_STATUS_LABELS = { submitted: 'Подадена', viewed: 'Прегледана', approved: 'Одобрена', rejected: 'Отхвърлена' }

const pad = (v) => String(v).padStart(2, '0')
const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (ds, amount) => { const d = new Date(`${ds}T00:00:00`); d.setDate(d.getDate() + amount); return localDate(d) }
const daysBetween = (s, e) => Math.round((new Date(`${e}T00:00:00`) - new Date(`${s}T00:00:00`)) / 86400000) + 1

const formatNumber = (v) => new Intl.NumberFormat('bg-BG').format(Number(v || 0))
const formatPercent = (v) => `${(Number(v || 0) * 100).toFixed(1)}%`
const formatEuro = (v) => `${new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v || 0))} €`
const formatDateLabel = (d) => (!d || d.length !== 8) ? d : `${d.slice(6, 8)}.${d.slice(4, 6)}.${d.slice(0, 4)}`
const formatShortDate = (d) => { if (!d) return ''; const p = String(d).split('-'); return p.length !== 3 ? d : `${p[2]}.${p[1]}.${p[0]}` }

function formatDuration(seconds) {
  const total = Math.round(Number(seconds || 0))
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  return minutes === 0 ? `${secs} сек.` : `${minutes} мин ${secs} сек.`
}

function Change({ current, previous, inverse = false }) {
  const c = Number(current || 0), p = Number(previous || 0)
  if (p === 0) return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>няма предходни данни</span>
  if (c === p) return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>→ без промяна</span>
  const change = ((c - p) / p) * 100
  const positive = inverse ? change < 0 : change > 0
  return (
    <span style={{ color: positive ? 'var(--color-teal)' : 'var(--color-danger)', fontSize: '0.78rem', fontWeight: 600 }}>
      {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
    </span>
  )
}

function SummaryCard({ title, value, current, previous, formatter = formatNumber, inverse = false }) {
  return (
    <div className="status-card">
      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.45rem' }}>{title}</div>
      <div style={{ fontSize: '1.7rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>{formatter(value)}</div>
      {previous !== undefined && <Change current={current} previous={previous} inverse={inverse} />}
    </div>
  )
}

function Section({ title, subtitle, children, full = false }) {
  return (
    <section className="status-card" style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', margin: '0.25rem 0 0' }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function DataTable({ columns, rows }) {
  if (!rows?.length) return <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Няма данни за избрания период.</p>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: col.align || 'left', padding: '0.55rem 0.4rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '0.6rem 0.4rem', borderBottom: '1px solid var(--color-border)', textAlign: col.align || 'left' }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PeriodSelector({ startDate, endDate, onChange }) {
  const [customOpen, setCustomOpen] = useState(false)
  const today = localDate()
  const yesterday = addDays(today, -1)
  const d = new Date()

  const presets = {
    today: [today, today],
    yesterday: [yesterday, yesterday],
    7: [addDays(today, -6), today],
    30: [addDays(today, -29), today],
    90: [addDays(today, -89), today],
    month: [localDate(new Date(d.getFullYear(), d.getMonth(), 1)), today],
    previousMonth: [
      localDate(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
      localDate(new Date(d.getFullYear(), d.getMonth(), 0))
    ]
  }

  const activePreset = Object.keys(presets).find(
    (key) => presets[key][0] === startDate && presets[key][1] === endDate
  ) || null

  const isCustomActive = customOpen || activePreset === null

  const getButtonStyle = (active) => ({
    color: 'var(--color-text)',
    border: `1px solid ${active ? 'var(--color-teal)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-teal)' : 'var(--color-surface)',
    borderRadius: '6px',
    padding: '0.45rem 0.7rem',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: active ? 600 : 400,
  })

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
      {[
        ['today', 'Днес'], ['yesterday', 'Вчера'], ['7', '7 дни'],
        ['30', '30 дни'], ['90', '90 дни'], ['month', 'Този месец'], ['previousMonth', 'Миналия месец']
      ].map(([value, label]) => {
        const active = activePreset === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => { setCustomOpen(false); onChange(...presets[value]) }}
            style={getButtonStyle(active)}
          >
            {label}
          </button>
        )
      })}

      <button
        type="button"
        onClick={() => setCustomOpen((val) => !val)}
        style={getButtonStyle(isCustomActive)}
      >
        По избор
      </button>

      {isCustomActive && (
        <>
          <input type="date" value={startDate} onChange={(e) => onChange(e.target.value, endDate)} />
          <span>→</span>
          <input type="date" value={endDate} onChange={(e) => onChange(startDate, e.target.value)} />
        </>
      )}
    </div>
  )
}

export function AdminAnalytics() {
  const today = localDate()
  const [startDate, setStartDate] = useState(addDays(today, -29))
  const [endDate, setEndDate] = useState(today)

  const [data, setData] = useState(null)
  const [dbData, setDbData] = useState(null)
  const [realtime, setRealtime] = useState(null)

  const [loading, setLoading] = useState(true)
  const [dbLoading, setDbLoading] = useState(true)
  const [realtimeLoading, setRealtimeLoading] = useState(true)

  const [error, setError] = useState('')
  const [dbError, setDbError] = useState('')
  const [realtimeError, setRealtimeError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchAnalytics = useCallback(async (start = startDate, end = endDate, showRefresh = false) => {
    if (!start || !end || start > end) return setError('Невалиден период.')
    try {
      setError('')
      showRefresh ? setRefreshing(true) : setLoading(true)
      const { data: res, error: err } = await supabase.functions.invoke('ga-stats', { body: { startDate: start, endDate: end } })
      if (err || res?.error) throw new Error(err?.message || res.error)
      setData(res)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [startDate, endDate])

  const fetchDbStats = useCallback(async (start = startDate, end = endDate, showRefresh = false) => {
    if (!start || !end || start > end) return setDbError('Невалиден период.')
    try {
      setDbError('')
      setDbLoading(true)
      const { data: res, error: err } = await supabase.functions.invoke('db-stats', { body: { startDate: start, endDate: end } })
      if (err || res?.error) throw new Error(err?.message || res.error)
      setDbData(res)
    } catch (e) {
      setDbError(e?.message || String(e))
    } finally {
      setDbLoading(false)
    }
  }, [startDate, endDate])

  const fetchRealtime = useCallback(async () => {
    try {
      setRealtimeError('')
      const { data: res, error: err } = await supabase.functions.invoke('ga-realtime')
      if (err || res?.error) throw new Error(err?.message || res.error)
      setRealtime(res)
    } catch (e) { setRealtimeError(e?.message || String(e)) }
    finally { setRealtimeLoading(false) }
  }, [])

  const gaTabs = ['overview', 'traffic', 'pages', 'users', 'behavior']

  // Петте GA таба показват едни и същи вече заредени данни — тук само
  // при ПЪРВОТО влизане в която и да е от тях зареждаме веднъж.
  useEffect(() => {
    if (gaTabs.includes(activeTab) && data === null) fetchAnalytics()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // При смяна на периода презареждаме GA данните само ако вече сме ги
  // зареждали поне веднъж — иначе PeriodSelector-ът ще ги тегли двойно
  // заедно с ефекта по-горе.
  useEffect(() => {
    if (data !== null) fetchAnalytics(startDate, endDate, true)
  }, [startDate, endDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'platform' && dbData === null) fetchDbStats()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (dbData !== null) fetchDbStats(startDate, endDate, true)
  }, [startDate, endDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== 'realtime') return
    fetchRealtime()
    const interval = setInterval(fetchRealtime, 60000)
    return () => clearInterval(interval)
  }, [activeTab, fetchRealtime])

  const summary = data?.summary || {}, previous = data?.previousSummary || {}
  const channels = data?.channels || [], sources = data?.sources || [], campaigns = data?.campaigns || [], facebookGroups = data?.facebookGroups || []
  const pages = data?.pages || [], landingPages = data?.landingPages || [], devices = data?.devices || []
  const browsers = data?.browsers || [], operatingSystems = data?.operatingSystems || []
  const countries = data?.countries || [], cities = data?.cities || [], events = data?.events || []
  const realtimePages = realtime?.pages || []

  const dbSummary = dbData?.summary || {}, dbPrevious = dbData?.previousSummary || {}, dbSnapshot = dbData?.snapshot || {}
  const dbJobs = dbData?.jobs || {}, dbApplications = dbData?.applications || {}, dbPayments = dbData?.payments || {}

  const channelRows = channels.map(r => ({ ...r, label: CHANNEL_LABELS[r.sessionDefaultChannelGroup] || r.sessionDefaultChannelGroup || 'Неопределен' }))
  const dbJobTierRows = (dbJobs.tiers || []).map(r => ({ ...r, label: JOB_TIER_LABELS[r.name] || r.name || 'Неизвестен' }))
  const dbJobStatusRows = (dbJobs.statuses || []).map(r => ({ ...r, label: JOB_STATUS_LABELS[r.name] || r.name || 'Неизвестен' }))
  const dbApplicationStatusRows = (dbApplications.statuses || []).map(r => ({ ...r, label: APPLICATION_STATUS_LABELS[r.name] || r.name || 'Неизвестен' }))

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <p className="dashboard-eyebrow">Администрация</p>
        <h1 className="dashboard-title">Аналитика на Jobstate</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>Google Analytics + данни от платформата · {startDate} → {endDate}</p>
      </div>

      <div className="status-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <PeriodSelector startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e) }} />
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'platform') fetchDbStats(startDate, endDate, true)
              else if (activeTab === 'realtime') fetchRealtime()
              else fetchAnalytics(startDate, endDate, true)
            }}
            disabled={
              activeTab === 'platform' ? dbLoading
                : activeTab === 'realtime' ? realtimeLoading
                  : (loading || refreshing)
            }
            style={{
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              borderRadius: '6px',
              padding: '0.5rem 0.8rem',
              cursor: 'pointer',
            }}
          >
            {(
              activeTab === 'platform' ? dbLoading
                : activeTab === 'realtime' ? realtimeLoading
                  : (loading || refreshing)
            ) ? 'Обновявам...' : '↻ Обнови'}
          </button>
        </div>
      </div>

      {error && <div className="status-card" style={{ color: 'var(--color-danger)', marginBottom: '1.25rem' }}>Грешка GA: <br />{error}</div>}
      {dbError && <div className="status-card" style={{ color: 'var(--color-danger)', marginBottom: '1.25rem' }}>Грешка БД: <br />{dbError}</div>}
      {loading && !data && <div className="status-card">Зареждам аналитиката...</div>}

      {data && !error && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
            {[
              ['overview', 'Обобщение'],
              ['traffic', 'Трафик'],
              ['pages', 'Страници'],
              ['users', 'Потребители'],
              ['behavior', 'Поведение'],
              ['platform', 'Платформа'],
              ['realtime', '🟢 В реално време'],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setActiveTab(val)}
                style={{
                  border: '1px solid var(--color-border)',
                  background: activeTab === val ? 'var(--color-teal)' : 'var(--color-surface)',
                  color: activeTab === val ? 'var(--color-text)' : 'inherit',
                  borderRadius: '6px',
                  padding: '0.5rem 0.85rem',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && data && !error && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <SummaryCard title="Потребители" value={summary.activeUsers} current={summary.activeUsers} previous={previous.activeUsers} />
                <SummaryCard title="Нови потребители" value={summary.newUsers} current={summary.newUsers} previous={previous.newUsers} />
                <SummaryCard title="Сесии" value={summary.sessions} current={summary.sessions} previous={previous.sessions} />
                <SummaryCard title="Преглеждания" value={summary.screenPageViews} current={summary.screenPageViews} previous={previous.screenPageViews} />
                <SummaryCard title="Ангажирани сесии" value={summary.engagedSessions} current={summary.engagedSessions} previous={previous.engagedSessions} />
                <SummaryCard title="Engagement rate" value={summary.engagementRate} current={summary.engagementRate} previous={previous.engagementRate} formatter={formatPercent} />
                <SummaryCard title="Bounce rate" value={summary.bounceRate} current={summary.bounceRate} previous={previous.bounceRate} formatter={formatPercent} inverse />
                <SummaryCard title="Средна сесия" value={summary.averageSessionDuration} current={summary.averageSessionDuration} previous={previous.averageSessionDuration} formatter={formatDuration} />
                <SummaryCard title="Events" value={summary.eventCount} current={summary.eventCount} previous={previous.eventCount} />
                <SummaryCard title="Key events" value={summary.keyEvents} current={summary.keyEvents} previous={previous.keyEvents} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                <Section title="Канали" subtitle="Откъде идват сесиите">
                  <DataTable rows={channelRows} columns={[{ key: 'label', label: 'Канал' }, { key: 'sessions', label: 'Сесии', align: 'right', render: r => formatNumber(r.sessions) }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }]} />
                </Section>
                <Section title="Устройства" subtitle="На какво устройство посещават сайта">
                  <DataTable rows={devices} columns={[{ key: 'deviceCategory', label: 'Устройство', render: r => DEVICE_LABELS[r.deviceCategory] || r.deviceCategory }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }, { key: 'sessions', label: 'Сесии', align: 'right', render: r => formatNumber(r.sessions) }]} />
                </Section>
              </div>
            </>
          )}

          {activeTab === 'traffic' && data && !error && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              <Section title="Канали" subtitle="Основните типове трафик">
                <DataTable rows={channelRows} columns={[{ key: 'label', label: 'Канал' }, { key: 'sessions', label: 'Сесии', align: 'right', render: r => formatNumber(r.sessions) }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }, { key: 'screenPageViews', label: 'Views', align: 'right', render: r => formatNumber(r.screenPageViews) }]} />
              </Section>
              <Section title="Източник / medium" subtitle="По-конкретно откъде идва трафикът">
                <DataTable rows={sources} columns={[{ key: 'sessionSourceMedium', label: 'Източник' }, { key: 'sessions', label: 'Сесии', align: 'right', render: r => formatNumber(r.sessions) }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }]} />
              </Section>
              <Section title="Кампании" subtitle="UTM кампании и други" full>
                <DataTable rows={campaigns} columns={[{ key: 'sessionCampaignName', label: 'Кампания', render: r => r.sessionCampaignName === '(not set)' ? 'Без кампания' : r.sessionCampaignName }, { key: 'sessions', label: 'Сесии', align: 'right', render: r => formatNumber(r.sessions) }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }, { key: 'screenPageViews', label: 'Views', align: 'right', render: r => formatNumber(r.screenPageViews) }]} />
              </Section>
              <Section title="Facebook групи" subtitle="Трафик по UTM content" full>
                <DataTable
                  rows={facebookGroups}
                  columns={[
                    { key: 'sessionManualAdContent', label: 'Група', render: r => r.sessionManualAdContent === '(not set)' ? 'Без група' : r.sessionManualAdContent },
                    { key: 'sessions', label: 'Сесии', align: 'right', render: r => formatNumber(r.sessions) },
                    { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) },
                    { key: 'screenPageViews', label: 'Views', align: 'right', render: r => formatNumber(r.screenPageViews) },
                  ]}
                />
              </Section>
              <Section title="Дневна активност" subtitle={`Данни за ${daysBetween(startDate, endDate)} дни`} full>
                <DataTable rows={data.daily} columns={[{ key: 'date', label: 'Дата', render: r => formatDateLabel(r.date) }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }, { key: 'newUsers', label: 'Нови', align: 'right', render: r => formatNumber(r.newUsers) }, { key: 'sessions', label: 'Сесии', align: 'right', render: r => formatNumber(r.sessions) }, { key: 'screenPageViews', label: 'Views', align: 'right', render: r => formatNumber(r.screenPageViews) }]} />
              </Section>
            </div>
          )}

          {activeTab === 'pages' && data && !error && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              <Section title="Най-посещавани страници" subtitle="По брой преглеждания" full>
                <DataTable rows={pages} columns={[{ key: 'pagePath', label: 'Страница' }, { key: 'screenPageViews', label: 'Преглеждания', align: 'right', render: r => formatNumber(r.screenPageViews) }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }, { key: 'averageSessionDuration', label: 'Средна сесия', align: 'right', render: r => formatDuration(r.averageSessionDuration) }]} />
              </Section>
              <Section title="Landing pages" subtitle="Начална страница на сесията" full>
                <DataTable rows={landingPages} columns={[{ key: 'landingPage', label: 'Начална страница' }, { key: 'sessions', label: 'Сесии', align: 'right', render: r => formatNumber(r.sessions) }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }, { key: 'screenPageViews', label: 'Views', align: 'right', render: r => formatNumber(r.screenPageViews) }]} />
              </Section>
            </div>
          )}

          {activeTab === 'users' && data && !error && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              <Section title="Държави" subtitle="Откъде идват потребителите">
                <DataTable rows={countries} columns={[{ key: 'country', label: 'Държава' }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }, { key: 'newUsers', label: 'Нови', align: 'right', render: r => formatNumber(r.newUsers) }, { key: 'sessions', label: 'Сесии', align: 'right', render: r => formatNumber(r.sessions) }]} />
              </Section>
              <Section title="Градове" subtitle="Градове с най-много посещения">
                <DataTable rows={cities} columns={[{ key: 'city', label: 'Град' }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }, { key: 'sessions', label: 'Сесии', align: 'right', render: r => formatNumber(r.sessions) }]} />
              </Section>
              <Section title="Браузъри" subtitle="Използвани браузъри">
                <DataTable rows={browsers} columns={[{ key: 'browser', label: 'Браузър' }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }, { key: 'sessions', label: 'Сесии', align: 'right', render: r => formatNumber(r.sessions) }]} />
              </Section>
              <Section title="Операционни системи" subtitle="Windows, Android, iOS и др.">
                <DataTable rows={operatingSystems} columns={[{ key: 'operatingSystem', label: 'ОС' }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }, { key: 'sessions', label: 'Сесии', align: 'right', render: r => formatNumber(r.sessions) }]} />
              </Section>
            </div>
          )}

          {activeTab === 'behavior' && data && !error && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              <Section title="Събития" subtitle="Какво правят посетителите" full>
                <DataTable rows={events} columns={[{ key: 'eventName', label: 'Събитие', render: r => EVENT_LABELS[r.eventName] || r.eventName }, { key: 'eventCount', label: 'Брой', align: 'right', render: r => formatNumber(r.eventCount) }, { key: 'keyEvents', label: 'Key events', align: 'right', render: r => formatNumber(r.keyEvents) }]} />
              </Section>
              <Section title="Дневна активност" subtitle="Как се е променял трафикът" full>
                <DataTable rows={data.daily} columns={[{ key: 'date', label: 'Дата', render: r => formatDateLabel(r.date) }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }, { key: 'engagedSessions', label: 'Ангажирани сесии', align: 'right', render: r => formatNumber(r.engagedSessions) }, { key: 'screenPageViews', label: 'Views', align: 'right', render: r => formatNumber(r.screenPageViews) }]} />
              </Section>
            </div>
          )}

          {activeTab === 'platform' && (
            <>
              {dbLoading && !dbData ? <div className="status-card">Зареждам статистиката на платформата...</div> : dbError ? <div className="status-card" style={{ color: 'var(--color-danger)' }}>Грешка БД: {dbError}</div> : dbData ? (
                <>
                  <div style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    Данните са за периода <strong>{startDate} → {endDate}</strong>.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <SummaryCard title="Нови обяви" value={dbSummary.newJobs} current={dbSummary.newJobs} previous={dbPrevious.newJobs} />
                    <SummaryCard title="Публикувани обяви" value={dbSummary.publishedJobs} />
                    <SummaryCard title="Нови компании" value={dbSummary.newCompanies} current={dbSummary.newCompanies} previous={dbPrevious.newCompanies} />
                    <SummaryCard title="Нови кандидати" value={dbSummary.newCandidates} current={dbSummary.newCandidates} previous={dbPrevious.newCandidates} />
                    <SummaryCard title="Кандидатури" value={dbSummary.applications} current={dbSummary.applications} previous={dbPrevious.applications} />
                    <SummaryCard title="Приходи" value={dbSummary.revenue} current={dbSummary.revenue} previous={dbPrevious.revenue} formatter={formatEuro} />
                    <SummaryCard title="Плащания" value={dbSummary.payments} />
                    <SummaryCard title="Платени обяви" value={dbSummary.paidJobPurchases} />
                    <SummaryCard title="Преглеждания на профили" value={dbSummary.profileViews} current={dbSummary.profileViews} previous={dbPrevious.profileViews} />
                    <SummaryCard title="Търсения" value={dbSummary.searches} />
                    <SummaryCard title="Съобщения" value={dbSummary.messages} />
                    <SummaryCard title="Запазени обяви" value={dbSummary.savedJobs} />
                  </div>

                  <Section title="Текущо състояние" subtitle="Към момента" full>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                      <SummaryCard title="Активни обяви" value={dbSnapshot.activeJobs} />
                      <SummaryCard title="Изтекли обяви" value={dbSnapshot.expiredJobs} />
                      <SummaryCard title="Чернови" value={dbSnapshot.draftJobs} />
                      <SummaryCard title="Активни кандидати" value={dbSnapshot.activeCandidates} />
                      <SummaryCard title="Gold кандидати" value={dbSnapshot.goldCandidates} />
                      <SummaryCard title="Верифицирани компании" value={dbSnapshot.verifiedCompanies} />
                      <SummaryCard title="Компании с активни обяви" value={dbSnapshot.companiesWithActiveJobs} />
                    </div>
                  </Section>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                    <Section title="Обяви по тип" subtitle="Създадени през периода">
                      <DataTable rows={dbJobTierRows} columns={[{ key: 'label', label: 'Тип' }, { key: 'count', label: 'Брой', align: 'right', render: r => formatNumber(r.count) }]} />
                    </Section>
                    <Section title="Обяви по статус" subtitle="Текущ статус">
                      <DataTable rows={dbJobStatusRows} columns={[{ key: 'label', label: 'Статус' }, { key: 'count', label: 'Брой', align: 'right', render: r => formatNumber(r.count) }]} />
                    </Section>
                    <Section title="Обяви по град" subtitle="Локация">
                      <DataTable rows={dbJobs.cities || []} columns={[{ key: 'name', label: 'Град' }, { key: 'count', label: 'Брой', align: 'right', render: r => formatNumber(r.count) }]} />
                    </Section>
                    <Section title="Обяви по сектор" subtitle="Сектори">
                      <DataTable rows={dbJobs.sectors || []} columns={[{ key: 'name', label: 'Сектор' }, { key: 'count', label: 'Брой', align: 'right', render: r => formatNumber(r.count) }]} />
                    </Section>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                    <Section title="Кандидатури по статус" subtitle="Статус">
                      <DataTable rows={dbApplicationStatusRows} columns={[{ key: 'label', label: 'Статус' }, { key: 'count', label: 'Брой', align: 'right', render: r => formatNumber(r.count) }]} />
                    </Section>
                    <Section title="Кандидатури по обява" subtitle="Топ обяви">
                      <DataTable rows={dbApplications.byJob || []} columns={[{ key: 'title', label: 'Обява' }, { key: 'count', label: 'Кандидатури', align: 'right', render: r => formatNumber(r.count) }]} />
                    </Section>
                  </div>

                  <Section title="Дневни кандидатури" subtitle="По дни" full>
                    <DataTable rows={dbApplications.daily || []} columns={[{ key: 'date', label: 'Дата', render: r => formatShortDate(r.date) }, { key: 'count', label: 'Кандидатури', align: 'right', render: r => formatNumber(r.count) }]} />
                  </Section>

                  <Section title="Приходи по продукт" subtitle="Записани плащания в payments" full style={{ marginTop: '1.25rem' }}>
                    <DataTable rows={dbPayments.byProduct || []} columns={[{ key: 'description', label: 'Продукт' }, { key: 'payments', label: 'Плащания', align: 'right', render: r => formatNumber(r.payments) }, { key: 'revenue', label: 'Приход', align: 'right', render: r => formatEuro(r.revenue) }, { key: 'currency', label: 'Валута', align: 'right' }]} />
                  </Section>
                </>
              ) : null}
            </>
          )}

          {activeTab === 'realtime' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              <div className="status-card" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>В момента</span>
                </div>
                {realtimeLoading && !realtime ? (
                  <div style={{ marginTop: '0.8rem', color: 'var(--color-text-muted)' }}>Зареждам realtime...</div>
                ) : realtimeError ? (
                  <div style={{ marginTop: '0.8rem', color: 'var(--color-danger)', fontSize: '0.85rem' }}>Realtime грешка: {realtimeError}</div>
                ) : (
                  <>
                    <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginTop: '0.35rem' }}>{formatNumber(realtime?.totalActiveUsers)}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>активни потребители</div>
                  </>
                )}
              </div>
              <Section title="Активни страници" subtitle="Какво гледат хората в момента" full>
                <DataTable rows={realtimePages} columns={[{ key: 'unifiedScreenName', label: 'Страница' }, { key: 'activeUsers', label: 'Потребители', align: 'right', render: r => formatNumber(r.activeUsers) }, { key: 'screenPageViews', label: 'Views', align: 'right', render: r => formatNumber(r.screenPageViews) }]} />
              </Section>
            </div>
          )}
        </>
      )}
    </div>
  )
}