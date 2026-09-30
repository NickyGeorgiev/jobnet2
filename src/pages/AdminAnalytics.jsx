import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const CHANNEL_LABELS = {
  Direct: 'Директен трафик',
  'Organic Search': 'Органично търсене',
  Referral: 'Препратки от други сайтове',
  'Organic Social': 'Социални мрежи',
  'Paid Social': 'Платени социални мрежи',
  'Paid Search': 'Платено търсене',
  Email: 'Имейл',
  Affiliates: 'Партньори',
  Video: 'Видео',
  Display: 'Display реклама',
  Unassigned: 'Неопределен',
}

const DEVICE_LABELS = {
  desktop: 'Компютър',
  mobile: 'Телефон',
  tablet: 'Таблет',
}

const EVENT_LABELS = {
  page_view: 'Преглед на страница',
  session_start: 'Начало на сесия',
  first_visit: 'Първо посещение',
  user_engagement: 'Ангажираност',
  scroll: 'Превъртане',
  click: 'Клик',
  view_search_results: 'Търсене',
  login: 'Вход',
  sign_up: 'Регистрация',
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(dateString, amount) {
  const date = new Date(`${dateString}T00:00:00`)
  date.setDate(date.getDate() + amount)
  return localDate(date)
}

function daysBetween(start, end) {
  const a = new Date(`${start}T00:00:00`)
  const b = new Date(`${end}T00:00:00`)
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1
}

function formatNumber(value) {
  return new Intl.NumberFormat('bg-BG').format(Number(value || 0))
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`
}

function formatDuration(seconds) {
  const total = Math.round(Number(seconds || 0))
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  if (minutes === 0) return `${secs} сек.`
  return `${minutes} мин ${secs} сек.`
}

function formatDateLabel(date) {
  if (!date || date.length !== 8) return date
  return `${date.slice(6, 8)}.${date.slice(4, 6)}.${date.slice(0, 4)}`
}

function changePercent(current, previous) {
  const c = Number(current || 0)
  const p = Number(previous || 0)
  if (p === 0) {
    if (c === 0) return 0
    return null
  }
  return ((c - p) / p) * 100
}

function Change({ current, previous, inverse = false }) {
  const change = changePercent(current, previous)
  if (change === null) {
    return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>няма предходни данни</span>
  }
  if (change === 0) {
    return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>→ без промяна</span>
  }
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
      <div style={{ fontSize: '1.7rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>
        {formatter(value)}
      </div>
      <Change current={current} previous={previous} inverse={inverse} />
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

function Empty() {
  return <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Няма данни за избрания период.</p>
}

function DataTable({ columns, rows }) {
  if (!rows?.length) return <Empty />
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  textAlign: column.align || 'left',
                  padding: '0.55rem 0.4rem',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    padding: '0.6rem 0.4rem',
                    borderBottom: '1px solid var(--color-border)',
                    textAlign: column.align || 'left',
                  }}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PeriodSelector({ startDate, endDate, onChange }) {
  const [custom, setCustom] = useState(false)

  const today = localDate()
  const yesterday = addDays(today, -1)

  function getActivePreset() {
    if (custom) return 'custom'

    if (startDate === today && endDate === today) return 'today'
    if (startDate === yesterday && endDate === yesterday) return 'yesterday'
    if (startDate === addDays(today, -6) && endDate === today) return '7'
    if (startDate === addDays(today, -29) && endDate === today) return '30'
    if (startDate === addDays(today, -89) && endDate === today) return '90'

    const date = new Date()
    const first = new Date(date.getFullYear(), date.getMonth(), 1)
    if (startDate === localDate(first) && endDate === today) return 'month'

    const previousFirst = new Date(date.getFullYear(), date.getMonth() - 1, 1)
    const previousLast = new Date(date.getFullYear(), date.getMonth(), 0)
    if (startDate === localDate(previousFirst) && endDate === localDate(previousLast)) return 'previousMonth'

    return null
  }

  const activePreset = getActivePreset()

  function selectPreset(preset) {
    if (preset === 'today') {
      setCustom(false)
      onChange(today, today)
      return
    }

    if (preset === 'yesterday') {
      setCustom(false)
      onChange(yesterday, yesterday)
      return
    }

    if (preset === '7') {
      setCustom(false)
      onChange(addDays(today, -6), today)
      return
    }

    if (preset === '30') {
      setCustom(false)
      onChange(addDays(today, -29), today)
      return
    }

    if (preset === '90') {
      setCustom(false)
      onChange(addDays(today, -89), today)
      return
    }

    if (preset === 'month') {
      const date = new Date()
      const first = new Date(date.getFullYear(), date.getMonth(), 1)
      setCustom(false)
      onChange(localDate(first), today)
      return
    }

    if (preset === 'previousMonth') {
      const date = new Date()
      const first = new Date(date.getFullYear(), date.getMonth() - 1, 1)
      const last = new Date(date.getFullYear(), date.getMonth(), 0)
      setCustom(false)
      onChange(localDate(first), localDate(last))
      return
    }

    if (preset === 'custom') {
      setCustom(true)
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
      {[
        ['today', 'Днес'],
        ['yesterday', 'Вчера'],
        ['7', '7 дни'],
        ['30', '30 дни'],
        ['90', '90 дни'],
        ['month', 'Този месец'],
        ['previousMonth', 'Миналия месец'],
      ].map(([value, label]) => {
        const active = activePreset === value

        return (
          <button
            key={value}
            type="button"
            onClick={() => selectPreset(value)}
            style={{
              color: active ? 'var(--color-text)' : 'var(--color-text)',
              border: `1px solid ${active ? 'var(--color-teal)' : 'var(--color-border)'}`,
              background: active ? 'var(--color-teal)' : 'var(--color-surface)',
              borderRadius: '6px',
              padding: '0.45rem 0.7rem',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: active ? 600 : 400,
            }}
          >
            {label}
          </button>
        )
      })}

      <button
        type="button"
        onClick={() => selectPreset('custom')}
        style={{
          border: `1px solid ${activePreset === 'custom' ? 'var(--color-teal)' : 'var(--color-border)'}`,
          background: activePreset === 'custom' ? 'var(--color-teal)' : 'var(--color-surface)',
          color: 'var(--color-text)',
          borderRadius: '6px',
          padding: '0.45rem 0.7rem',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: activePreset === 'custom' ? 600 : 400,
        }}
      >
        По избор
      </button>

      {custom && (
        <>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onChange(e.target.value, endDate)}
          />
          <span>→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onChange(startDate, e.target.value)}
          />
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
  const [realtime, setRealtime] = useState(null)
  const [loading, setLoading] = useState(true)
  const [realtimeLoading, setRealtimeLoading] = useState(true)
  const [error, setError] = useState('')
  const [realtimeError, setRealtimeError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchAnalytics = useCallback(
    async (start = startDate, end = endDate, showRefresh = false) => {
      if (!start || !end) return
      if (start > end) {
        setError('Началната дата не може да бъде след крайната дата.')
        return
      }
      try {
        setError('')
        if (showRefresh) setRefreshing(true)
        else setLoading(true)

        const { data: response, error: functionError } = await supabase.functions.invoke('ga-stats', {
          body: { startDate: start, endDate: end },
        })

        if (functionError) throw functionError
        if (response?.error) throw new Error(response.error)
        setData(response)
      } catch (e) {
        setError(e?.message || String(e))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [startDate, endDate]
  )

  const fetchRealtime = useCallback(async () => {
    try {
      setRealtimeError('')
      const { data: response, error: functionError } = await supabase.functions.invoke('ga-realtime')
      if (functionError) throw functionError
      if (response?.error) throw new Error(response.error)
      setRealtime(response)
    } catch (e) {
      setRealtimeError(e?.message || String(e))
    } finally {
      setRealtimeLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  useEffect(() => {
    fetchRealtime()
    const interval = setInterval(() => { fetchRealtime() }, 60000)
    return () => clearInterval(interval)
  }, [fetchRealtime])

  const summary = data?.summary || {}
  const previous = data?.previousSummary || {}
  const channels = data?.channels || []
  const sources = data?.sources || []
  const campaigns = data?.campaigns || []
  const pages = data?.pages || []
  const landingPages = data?.landingPages || []
  const devices = data?.devices || []
  const browsers = data?.browsers || []
  const operatingSystems = data?.operatingSystems || []
  const countries = data?.countries || []
  const cities = data?.cities || []
  const events = data?.events || []
  const realtimePages = realtime?.pages || []

  const days = useMemo(() => daysBetween(startDate, endDate), [startDate, endDate])
  const periodLabel = `${startDate} → ${endDate}`

  const channelRows = channels.map((row) => ({
    ...row,
    label: CHANNEL_LABELS[row.sessionDefaultChannelGroup] || row.sessionDefaultChannelGroup || 'Неопределен',
  }))

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <p className="dashboard-eyebrow">Администрация</p>
        <h1 className="dashboard-title">Аналитика на Jobstate</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
          Данни от Google Analytics · {periodLabel}
        </p>
      </div>

      <div className="status-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <PeriodSelector
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start)
              setEndDate(end)
            }}
          />
          <button
            type="button"
            onClick={() => fetchAnalytics(startDate, endDate, true)}
            disabled={loading || refreshing}
            style={{
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              borderRadius: '6px',
              padding: '0.5rem 0.8rem',
              cursor: loading || refreshing ? 'default' : 'pointer',
              opacity: loading || refreshing ? 0.6 : 1,
            }}
          >
            {refreshing ? 'Обновявам...' : '↻ Обнови'}
          </button>
        </div>
      </div>

      {error && (
        <div className="status-card" style={{ color: 'var(--color-danger)', marginBottom: '1.25rem' }}>
          Грешка при зареждане:<br />{error}
        </div>
      )}

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
              ['realtime', '🟢 В реално време'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                style={{
                  border: '1px solid var(--color-border)',
                  background: activeTab === value ? 'var(--color-teal)' : 'var(--color-surface)',
                  color: activeTab === value ? 'var(--color-text)' : 'inherit',
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

          {activeTab === 'overview' && (
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
                  <DataTable
                    rows={channelRows}
                    columns={[
                      { key: 'label', label: 'Канал' },
                      { key: 'sessions', label: 'Сесии', align: 'right', render: (r) => formatNumber(r.sessions) },
                      { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                    ]}
                  />
                </Section>
                <Section title="Устройства" subtitle="На какво устройство посещават сайта">
                  <DataTable
                    rows={devices}
                    columns={[
                      { key: 'deviceCategory', label: 'Устройство', render: (r) => DEVICE_LABELS[r.deviceCategory] || r.deviceCategory },
                      { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                      { key: 'sessions', label: 'Сесии', align: 'right', render: (r) => formatNumber(r.sessions) },
                    ]}
                  />
                </Section>
              </div>
            </>
          )}

          {activeTab === 'traffic' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              <Section title="Канали" subtitle="Основните типове трафик">
                <DataTable
                  rows={channelRows}
                  columns={[
                    { key: 'label', label: 'Канал' },
                    { key: 'sessions', label: 'Сесии', align: 'right', render: (r) => formatNumber(r.sessions) },
                    { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                    { key: 'screenPageViews', label: 'Views', align: 'right', render: (r) => formatNumber(r.screenPageViews) },
                  ]}
                />
              </Section>
              <Section title="Източник / medium" subtitle="По-конкретно откъде идва трафикът">
                <DataTable
                  rows={sources}
                  columns={[
                    { key: 'sessionSourceMedium', label: 'Източник' },
                    { key: 'sessions', label: 'Сесии', align: 'right', render: (r) => formatNumber(r.sessions) },
                    { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                  ]}
                />
              </Section>
              <Section title="Кампании" subtitle="UTM кампании и други кампании" full>
                <DataTable
                  rows={campaigns}
                  columns={[
                    { key: 'sessionCampaignName', label: 'Кампания', render: (r) => r.sessionCampaignName === '(not set)' ? 'Без кампания' : r.sessionCampaignName },
                    { key: 'sessions', label: 'Сесии', align: 'right', render: (r) => formatNumber(r.sessions) },
                    { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                    { key: 'screenPageViews', label: 'Views', align: 'right', render: (r) => formatNumber(r.screenPageViews) },
                  ]}
                />
              </Section>
              <Section title="Дневна активност" subtitle={`Данни за ${days} дни`} full>
                <DataTable
                  rows={data.daily}
                  columns={[
                    { key: 'date', label: 'Дата', render: (r) => formatDateLabel(r.date) },
                    { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                    { key: 'newUsers', label: 'Нови', align: 'right', render: (r) => formatNumber(r.newUsers) },
                    { key: 'sessions', label: 'Сесии', align: 'right', render: (r) => formatNumber(r.sessions) },
                    { key: 'screenPageViews', label: 'Views', align: 'right', render: (r) => formatNumber(r.screenPageViews) },
                  ]}
                />
              </Section>
            </div>
          )}

          {activeTab === 'pages' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              <Section title="Най-посещавани страници" subtitle="По брой преглеждания" full>
                <DataTable
                  rows={pages}
                  columns={[
                    { key: 'pagePath', label: 'Страница' },
                    { key: 'screenPageViews', label: 'Преглеждания', align: 'right', render: (r) => formatNumber(r.screenPageViews) },
                    { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                    { key: 'averageSessionDuration', label: 'Средна сесия', align: 'right', render: (r) => formatDuration(r.averageSessionDuration) },
                  ]}
                />
              </Section>
              <Section title="Landing pages" subtitle="Страницата, от която започва сесията" full>
                <DataTable
                  rows={landingPages}
                  columns={[
                    { key: 'landingPage', label: 'Начална страница' },
                    { key: 'sessions', label: 'Сесии', align: 'right', render: (r) => formatNumber(r.sessions) },
                    { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                    { key: 'screenPageViews', label: 'Views', align: 'right', render: (r) => formatNumber(r.screenPageViews) },
                  ]}
                />
              </Section>
            </div>
          )}

          {activeTab === 'users' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              <Section title="Държави" subtitle="Откъде идват потребителите">
                <DataTable
                  rows={countries}
                  columns={[
                    { key: 'country', label: 'Държава' },
                    { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                    { key: 'newUsers', label: 'Нови', align: 'right', render: (r) => formatNumber(r.newUsers) },
                    { key: 'sessions', label: 'Сесии', align: 'right', render: (r) => formatNumber(r.sessions) },
                  ]}
                />
              </Section>
              <Section title="Градове" subtitle="Градове с най-много посещения">
                <DataTable
                  rows={cities}
                  columns={[
                    { key: 'city', label: 'Град' },
                    { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                    { key: 'sessions', label: 'Сесии', align: 'right', render: (r) => formatNumber(r.sessions) },
                  ]}
                />
              </Section>
              <Section title="Браузъри" subtitle="Използвани браузъри">
                <DataTable
                  rows={browsers}
                  columns={[
                    { key: 'browser', label: 'Браузър' },
                    { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                    { key: 'sessions', label: 'Сесии', align: 'right', render: (r) => formatNumber(r.sessions) },
                  ]}
                />
              </Section>
              <Section title="Операционни системи" subtitle="Windows, Android, iOS и др.">
                <DataTable
                  rows={operatingSystems}
                  columns={[
                    { key: 'operatingSystem', label: 'ОС' },
                    { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                    { key: 'sessions', label: 'Сесии', align: 'right', render: (r) => formatNumber(r.sessions) },
                  ]}
                />
              </Section>
            </div>
          )}

          {activeTab === 'behavior' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              <Section title="Събития" subtitle="Какво правят посетителите" full>
                <DataTable
                  rows={events}
                  columns={[
                    { key: 'eventName', label: 'Събитие', render: (r) => EVENT_LABELS[r.eventName] || r.eventName },
                    { key: 'eventCount', label: 'Брой', align: 'right', render: (r) => formatNumber(r.eventCount) },
                    { key: 'keyEvents', label: 'Key events', align: 'right', render: (r) => formatNumber(r.keyEvents) },
                  ]}
                />
              </Section>
              <Section title="Дневна активност" subtitle="Как се е променял трафикът" full>
                <DataTable
                  rows={data.daily}
                  columns={[
                    { key: 'date', label: 'Дата', render: (r) => formatDateLabel(r.date) },
                    { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                    { key: 'engagedSessions', label: 'Ангажирани сесии', align: 'right', render: (r) => formatNumber(r.engagedSessions) },
                    { key: 'screenPageViews', label: 'Views', align: 'right', render: (r) => formatNumber(r.screenPageViews) },
                  ]}
                />
              </Section>
            </div>
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
                  <div style={{ marginTop: '0.8rem', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
                    Realtime не е наличен:<br />{realtimeError}
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginTop: '0.35rem' }}>
                      {formatNumber(realtime?.totalActiveUsers)}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>активни потребители</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', marginTop: '0.5rem' }}>
                      Автоматично обновяване на 60 секунди
                    </div>
                  </>
                )}
              </div>

              <Section title="Активни страници" subtitle="Какво гледат хората в момента" full>
                {realtimeError ? (
                  <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{realtimeError}</p>
                ) : (
                  <DataTable
                    rows={realtimePages}
                    columns={[
                      { key: 'unifiedScreenName', label: 'Страница' },
                      { key: 'activeUsers', label: 'Потребители', align: 'right', render: (r) => formatNumber(r.activeUsers) },
                      { key: 'screenPageViews', label: 'Views', align: 'right', render: (r) => formatNumber(r.screenPageViews) },
                    ]}
                  />
                )}
              </Section>

              <div className="status-card" style={{ gridColumn: '1 / -1', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                Realtime статистиката е умишлено ограничена до активността по страници, за да не се изчерпва излишно GA4 realtime квотата.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}