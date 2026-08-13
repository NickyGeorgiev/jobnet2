import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function handleRegistrationConversion(session) {
      if (!session?.user) return

      const pendingRegistrationRaw =
        sessionStorage.getItem('pending_registration')

      if (!pendingRegistrationRaw) {
        return
      }

      let pendingRegistration

      try {
        pendingRegistration =
          JSON.parse(pendingRegistrationRaw)
      } catch {
        sessionStorage.removeItem('pending_registration')
        return
      }

      const method = pendingRegistration?.method
      const createdAt = pendingRegistration?.createdAt

      if (!method || !createdAt) {
        sessionStorage.removeItem('pending_registration')
        return
      }

      /*
        За email регистрациите:
        стигаме дотук чак след като Supabase е създал session,
        което при включено email confirmation означава,
        че потребителят вече е потвърдил email-а си.
      */

      /*
        За Google/LinkedIn проверяваме дали OAuth потребителят
        наистина е нов.

        Ако created_at е много по-стар от момента,
        в който е започнат OAuth процесът, вероятно това е
        съществуващ потребител, който просто се е логнал.
      */

      if (
        method === 'google' ||
        method === 'linkedin'
      ) {
        const userCreatedAt = new Date(
          session.user.created_at
        ).getTime()

        /*
          Допускаме до 5 минути разлика.
          Това покрива OAuth redirect процеса.
        */
        const fiveMinutes = 5 * 60 * 1000

        if (
          Math.abs(userCreatedAt - createdAt) >
          fiveMinutes
        ) {
          sessionStorage.removeItem(
            'pending_registration'
          )

          return
        }
      }

      /*
        Всичко е наред.

        Изпращаме event към Google Tag Manager.
      */
      window.dataLayer = window.dataLayer || []

      window.dataLayer.push({
        event: 'registration_complete',
        registration_method: method,
      })

      /*
        Изтриваме маркера, за да не отчетем същата
        регистрация повторно при refresh/login.
      */
      sessionStorage.removeItem('pending_registration')
    }

    async function initializeSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(session)

      if (session) {
        await handleRegistrationConversion(session)
        await loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    }

    initializeSession()

    const {
      data: listener,
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return

        setSession(session)

        if (session) {
          await handleRegistrationConversion(session)
          await loadProfile(session.user.id)
        } else {
          setProfile(null)
          setDisplayName(null)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(data)

    if (data?.role === 'candidate') {
      const { data: cv } = await supabase
        .from('candidates')
        .select('fname, lname')
        .eq('id', userId)
        .single()

      setDisplayName(
        [cv?.fname, cv?.lname]
          .filter(Boolean)
          .join(' ') || null
      )
    } else if (data?.role === 'company') {
      const { data: comp } = await supabase
        .from('companies')
        .select('company_name')
        .eq('id', userId)
        .single()

      setDisplayName(
        comp?.company_name || null
      )
    } else {
      setDisplayName(null)
    }

    setLoading(false)
  }

  async function refreshProfile() {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()

    if (currentSession) {
      setSession(currentSession)
      await loadProfile(currentSession.user.id)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        refreshProfile,
        displayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}