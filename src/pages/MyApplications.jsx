import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { useSeo } from '../useSeo'
import { seo } from '../seo'
import './JobListings.css'

// Сайтът с публичните обяви (виж jobstate-jobs-ssr проекта).
const JOBS_SITE_URL = import.meta.env.VITE_JOBS_SITE_URL || 'https://jobs.jobstate.net'

const STATUS_LABEL = {
  submitted: 'Изпратена',
  viewed: 'Разгледана от фирмата',
  approved: 'Одобрена',
  rejected: 'Отхвърлена',
}

const STATUS_CLASS = {
  submitted: 'draft',
  viewed: 'published',
  approved: 'published',
  rejected: 'closed',
}

export function MyApplications() {
    useSeo(seo.myApplications)
  const { session } = useAuth()
  const [applications, setApplications] = useState(null)

  useEffect(() => {
    if (session) loadApplications()
  }, [session])

  async function loadApplications() {
    const { data } = await supabase.rpc('get_my_applications')
    setApplications(data || [])
  }

  if (applications === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <p className="dashboard-eyebrow">Кандидат</p>
        <h1 className="dashboard-title">Моите кандидатствания</h1>
      </div>

      <div className="blog-admin-list">
        {applications.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)' }}>
            Все още не си кандидатствал за нито една обява.
          </p>
        )}

        {applications.map((app) => {
          const appliedDate = new Date(app.created_at).toLocaleDateString('bg-BG', {
            day: 'numeric', month: 'long', year: 'numeric',
          })

          return (
            <div key={app.id} className="job-admin-row">
              <div>
                <p className="blog-admin-row-title">
                  <span className={`blog-status-badge blog-status-badge--${STATUS_CLASS[app.status]}`}>
                    {STATUS_LABEL[app.status] || app.status}
                  </span>
                  {app.job_title || 'Обявата вече не съществува'}
                </p>
                <p className="blog-admin-row-meta">
                  {app.job_city || 'без град'} · {app.job_sector || 'без сектор'} · Кандидатствано на {appliedDate}
                </p>
                {app.message && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                    Твоето съобщение: {app.message}
                  </p>
                )}
              </div>

              {app.job_status === 'published' && (
                <div className="job-listing-row-actions">
                  <a
                    href={`${JOBS_SITE_URL}/jobs/${app.job_slug}-${app.job_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ textDecoration: 'none' }}
                  >
                    Виж обявата
                  </a>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
