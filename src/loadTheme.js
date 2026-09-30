// Тегли dark + light цветовете от site_settings ЕДИН път при старт на приложението
// и ги пази в паметта, за да не удряме Supabase при всяко превключване на тема.
import { supabase } from './supabaseClient'

let cache = null // { dark: {key: value}, light: {key: value} }
let loadingPromise = null

async function fetchAndCache() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value, theme')
    .in('theme', ['dark', 'light'])

  if (error || !data) {
    console.error('Error loading theme settings:', error)
    cache = { dark: {}, light: {} }
    return cache
  }

  const result = { dark: {}, light: {} }
  data.forEach(({ key, value, theme }) => {
    result[theme][key] = value
  })
  cache = result
  return cache
}

// Тегли (или връща вече изтегленото) — безопасно за паралелни извиквания.
export async function ensureThemeSettings() {
  if (cache) return cache
  if (!loadingPromise) loadingPromise = fetchAndCache()
  return loadingPromise
}

// Прилага кешираните стойности на дадена тема ('dark' | 'light') върху документа.
export function applyThemeSettings(theme) {
  if (!cache) return
  const values = cache[theme] || {}
  const root = document.documentElement
  Object.entries(values).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })
}

// Обратна съвместимост с досегашните извиквания на loadTheme() —
// тегли (ако трябва) и прилага тъмната тема.
export async function loadTheme() {
  await ensureThemeSettings()
  applyThemeSettings('dark')
}
