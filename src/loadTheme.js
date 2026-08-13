import { supabase } from './supabaseClient'

export async function loadTheme() {
  const { data } = await supabase.from('site_settings').select('key, value')
  if (!data) return

  const root = document.documentElement
  data.forEach(({ key, value }) => {
    root.style.setProperty(`--${key}`, value)
  })
}