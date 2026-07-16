import { supabase } from './supabaseClient'

// Тегли текущите цветове от базата и ги прилага директно върху документа —
// CSS custom properties са "живи", затова промяната е мигновена, без reload.
export async function loadTheme() {
  const { data } = await supabase.from('site_settings').select('key, value')
  if (!data) return

  const root = document.documentElement
  data.forEach(({ key, value }) => {
    root.style.setProperty(`--${key}`, value)
  })
}