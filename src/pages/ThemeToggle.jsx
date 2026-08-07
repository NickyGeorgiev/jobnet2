import { useState, useEffect } from 'react'
import { loadTheme } from '../loadTheme'

const LIGHT_COLORS = {
  'color-bg': '#f5f6f8',
  'color-surface': '#ffffff',
  'color-surface-raised': '#eef0f3',
  'color-border': '#dde1e6',
  'color-text': '#1a1d23',
  'color-text-muted': '#5c6270',
}

function applyLight() {
  Object.entries(LIGHT_COLORS).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${key}`, value)
  })
}

function applyDark() {
  Object.keys(LIGHT_COLORS).forEach((key) => {
    document.documentElement.style.removeProperty(`--${key}`)
  })
  loadTheme()
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
    theme === 'light' ? applyLight() : applyDark()
  }, [theme])

  return (
    <button className="theme-toggle-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Смени темата">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}