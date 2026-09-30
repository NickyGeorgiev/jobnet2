import { useState, useEffect } from 'react'
import { ensureThemeSettings, applyThemeSettings } from '../loadTheme'
import { FiSun } from "react-icons/fi";
import { GoMoon } from "react-icons/go";

function setThemeCookie(theme) {
  // domain=.jobstate.net, за да е достъпна и от jobs.jobstate.net (Next.js SSR)
  const domain = window.location.hostname.endsWith('jobstate.net') ? '; domain=.jobstate.net' : ''
  document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax${domain}`
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
    setThemeCookie(theme)

    // Стойностите вече са изтеглени и кеширани при старта на приложението
    // (main.jsx) — тук само превключваме кой кеширан комплект се прилага.
    ensureThemeSettings().then(() => applyThemeSettings(theme))
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
