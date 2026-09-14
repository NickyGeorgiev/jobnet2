import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ userId, children }) {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!userId) {
      setNotifications([])
      return
    }
    loadNotifications()
  }, [userId])

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifications(data || [])
  }

  async function markRead(id) {
    await supabase.rpc('mark_notification_read', { p_id: id })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n))
    )
  }

  async function markAllRead() {
    await supabase.rpc('mark_all_notifications_read')
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
  }

  async function deleteNotification(id) {
    await supabase.rpc('delete_notification', { p_id: id })
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, deleteNotification }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
