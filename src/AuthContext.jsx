import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)

    if (data?.role === 'candidate') {
      const { data: cv } = await supabase.from('candidates').select('fname, lname').eq('id', userId).single()
      setDisplayName([cv?.fname, cv?.lname].filter(Boolean).join(' ') || null)
    } else if (data?.role === 'company') {
      const { data: comp } = await supabase.from('companies').select('company_name').eq('id', userId).single()
      setDisplayName(comp?.company_name || null)
    }

    setLoading(false)
  }

  // Позволява на други части от приложението (напр. Register.jsx) да поискат
  // презареждане на профила веднага след като знаят, че редът вече съществува —
  // вместо да чакат следващо auth събитие да го "хване" случайно.
  async function refreshProfile() {
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (currentSession) {
      setSession(currentSession)
      await loadProfile(currentSession.user.id)
    }
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile, displayName }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}