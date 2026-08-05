import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useSeo } from '../useSeo'
import { seo } from '../seo'
import './AdminDashboard.css'

const SETTING_LABELS = {
  'color-bg': 'Фон на страницата',
  'color-surface': 'Фон на карти/панели',
  'color-surface-raised': 'По-светла повърхност (вложени елементи)',
  'color-border': 'Рамки/разделители',
  'color-text': 'Основен текст',
  'color-text-muted': 'Второстепенен текст',
  'color-gold': 'Gold акцент',
  'color-teal': 'Company/бизнес акцент',
  'color-danger': 'Грешки/опасност',
  'color-success': 'Успех',
}

export function AdminDashboard() {
  useSeo(seo.adminDashboard)
  const [stats, setStats] = useState(null)
  const [freeMode, setFreeModeLocal] = useState(null)
  const [togglingFreeMode, setTogglingFreeMode] = useState(false)
  const [settings, setSettings] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadStats()
    loadSettings()
    loadActivity()
    loadFreeMode()
  }, [])

  async function loadStats() {
    const now = new Date().toISOString()
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const [
      candidatesCount,
      companiesCount,
      goldActiveCount,
      companiesPaidCount,
      trialCount,
      monthPayments,
      allPayments,
    ] = await Promise.all([
      supabase.from('candidates').select('*', { count: 'exact', head: true }),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('candidates').select('*', { count: 'exact', head: true }).gt('gold_until', now),
      supabase.from('companies').select('*', { count: 'exact', head: true }).gt('paid_until', now),
      supabase.from('companies').select('*', { count: 'exact', head: true }).gt('trial_ends_at', now),
      supabase.from('payments').select('amount').gte('created_at', startOfMonth),
      supabase.from('payments').select('amount'),
    ])

    const monthRevenue = (monthPayments.data || []).reduce((sum, p) => sum + Number(p.amount), 0)
    const totalRevenue = (allPayments.data || []).reduce((sum, p) => sum + Number(p.amount), 0)

    setStats({
      candidates: candidatesCount.count || 0,
      companies: companiesCount.count || 0,
      goldActive: goldActiveCount.count || 0,
      companiesPaid: companiesPaidCount.count || 0,
      trialing: trialCount.count || 0,
      monthRevenue,
      totalRevenue,
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

    setActivity({
      totalSearches: allSearches.length,
      totalProfileViews: viewLogs.count || 0,
      totalMessages: msgLogs.count || 0,
      topSectors,
      topCities,
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
                ? 'Company search и Gold статус са безплатни за всички потребители.'
                : 'Company search и Gold статус изискват плащане, както обичайно.'}
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
            <p className="admin-stat-value">{stats.goldActive}</p>
            <p className="admin-stat-label">Активни Gold кандидати</p>
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
        </>
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