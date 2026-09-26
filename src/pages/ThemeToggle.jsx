import { useState, useEffect } from 'react'
import { loadTheme } from '../loadTheme'
import { FiSun } from "react-icons/fi";
import { GoMoon } from "react-icons/go";


const LIGHT_COLORS = {
  'color-bg': '#e4e5f1',
  'color-surface': '#9394a5',
  'color-surface-raised': '#d2d3db',
  'color-border': '#616269',
  'color-text': '#000000',
  'color-text-muted': '#172033',
  'color-gold': 'linear-gradient(120deg, #BF953F 0%, #FCF6BA 50%, #B38728 100%)',
  'color-gold-soft': 'rgba(239,191,4, 0.7)',
  'color-teal': '#48cae4',
  'color-teal-soft': 'rgba(134, 197, 216, 0.20)',
  'color-danger': '#070606',
  'color-success': '#34845b',
}

function setThemeCookie(theme) {
  // domain=.jobstate.net, за да е достъпна и от jobs.jobstate.net (Next.js SSR)
  const domain = window.location.hostname.endsWith('jobstate.net') ? '; domain=.jobstate.net' : ''
  document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax${domain}`
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
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)

    // Това е важното за Next.js
    setThemeCookie(theme)

    if (theme === 'light') {
      applyLight()
    } else {
      applyDark()
    }
  }, [theme])

  return (
    <button
      className="theme-toggle-btn"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Смени темата"
    >
      {theme === 'dark' ?<><FiSun size={20} /></> : <><GoMoon size={20}/></>}
    </button>
  )
}