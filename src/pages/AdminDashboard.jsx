import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
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
  const [stats, setStats] = useState(null)
  const [settings, setSettings] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadStats()
    loadSettings()
  }, [])

  async function loadStats() {
    const [
      candidatesCount,
      companiesCount,
      goldCount,
      activeSubsCount,
      trialCount,
    ] = await Promise.all([
      supabase.from('candidates').select('*', { count: 'exact', head: true }),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('is_gold', true),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('companies').select('*', { count: 'exact', head: true }).gt('trial_ends_at', new Date().toISOString()),
    ])

    const gold = goldCount.count || 0
    const activeSubs = activeSubsCount.count || 0

    setStats({
      candidates: candidatesCount.count || 0,
      companies: companiesCount.count || 0,
      gold,
      activeSubs,
      trialing: trialCount.count || 0,
      estimatedRevenue: gold * 10 + activeSubs * 30,
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
            <p className="admin-stat-value">{stats.gold}</p>
            <p className="admin-stat-label">Gold кандидати</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-value">{stats.activeSubs}</p>
            <p className="admin-stat-label">Активни фирмени абонаменти</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-value">{stats.trialing}</p>
            <p className="admin-stat-label">Фирми в пробен период</p>
          </div>
          <div className="admin-stat-card" style={{ borderColor: 'var(--color-gold)' }}>
            <p className="admin-stat-value" style={{ color: 'var(--color-gold)' }}>{stats.estimatedRevenue}€</p>
            <p className="admin-stat-label">Очакван месечен приход</p>
          </div>
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