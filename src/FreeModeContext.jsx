import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const FreeModeContext = createContext(true)

export function FreeModeProvider({ children }) {
  const [freeMode, setFreeMode] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'free_launch_mode')
        .single()
      setFreeMode(data?.value === 'true')
      setLoaded(true)
    }
    load()
  }, [])

  return (
    <FreeModeContext.Provider value={{ freeMode, loaded }}>
      {children}
    </FreeModeContext.Provider>
  )
}

export function useFreeMode() {
  return useContext(FreeModeContext)
}