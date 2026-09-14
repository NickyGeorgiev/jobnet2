import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TbBellRinging2 } from 'react-icons/tb'
import { useNotifications } from '../NotificationsContext'

function formatRelativeDate(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))

  if (hours < 1) return 'преди по-малко от час'
  if (hours < 24) return `преди ${hours} ${hours === 1 ? 'час' : 'часа'}`

  const days = Math.floor(hours / 24)
  if (days < 7) return `преди ${days} ${days === 1 ? 'ден' : 'дни'}`

  return new Date(dateString).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' })
}

export function NotificationBell({ className = '' }) {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotifications()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`notification-bell ${className}`} ref={rootRef}>
      <button className="notification-bell-trigger" onClick={() => setOpen((o) => !o)} aria-label="Известия">
        <TbBellRinging2 style={{ color: 'var(--color-text)' }} />
        {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-bell-panel">
          <div className="notification-bell-panel-header">
            <span>Известия</span>
            {unreadCount > 0 && (
              <button className="notification-bell-mark-all" onClick={markAllRead}>
                Маркирай всички като прочетени
              </button>
            )}
          </div>

          {notifications.length === 0 && (
            <p className="notification-bell-empty">Все още нямаш известия.</p>
          )}

          <div className="notification-bell-list">
            {notifications.map((n) => {
              const isExternal = n.link && /^https?:\/\//i.test(n.link)

              const body = (
                <div
                  className={`notification-bell-item ${!n.read_at ? 'is-unread' : ''}`}
                  onClick={() => markRead(n.id)}
                >
                  <p className="notification-bell-item-title">{n.title}</p>
                  {n.body && <p className="notification-bell-item-body">{n.body}</p>}
                  <p className="notification-bell-item-date">{formatRelativeDate(n.created_at)}</p>
                </div>
              )

              let content
              if (isExternal) {
                content = (
                  <a href={n.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setOpen(false)}>
                    {body}
                  </a>
                )
              } else if (n.link) {
                content = (
                  <Link to={n.link} style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setOpen(false)}>
                    {body}
                  </Link>
                )
              } else {
                content = body
              }

              return (
                <div key={n.id} className="notification-bell-row">
                  {content}
                  <button
                    className="notification-bell-delete"
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id) }}
                    aria-label="Изтрий известието"
                    title="Изтрий"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
