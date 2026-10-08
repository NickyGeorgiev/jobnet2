import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'
import './JobListings.css'

const JOBS_SITE_URL = import.meta.env.VITE_JOBS_SITE_URL || 'https://jobs.jobstate.net'

const STATUS_LABEL = { draft: 'Чернова', published: 'Публикувана', closed: 'Затворена', expired: 'Изтекла' }
const STATUS_BADGE_CLASS = {
  draft: 'blog-status-badge--draft',
  published: 'blog-status-badge--published',
  closed: 'blog-status-badge--rejected',
  expired: 'blog-status-badge--rejected',
}

export function AdminJobs() {
  const [jobs, setJobs] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expiringOnly, setExpiringOnly] = useState(false)
  const { showToast } = useToast()
  const [generatingOg, setGeneratingOg] = useState(false)
  const [ogProgress, setOgProgress] = useState({ current: 0, total: 0 })

  async function load() {
    const { data, error } = await supabase
      .from('job_listings')
      .select('id, title, slug, city, sector, status, tier, salary, salary_max, salary_visible, expires_at, published_at, created_at, company_id, companies(company_name)')
      .order('created_at', { ascending: false })

    if (error) {
      showToast('Грешка при зареждане: ' + error.message, 'error')
      setJobs([])
      return
    }
    setJobs(data || [])
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!jobs) return null
    const q = search.trim().toLowerCase()
    const now = Date.now()
    const soonCutoff = now + 3 * 24 * 60 * 60 * 1000 // 3 дни напред

    return jobs
      .filter((j) => statusFilter === 'all' || j.status === statusFilter)
      .filter((j) => {
        if (!expiringOnly) return true
        if (j.status !== 'published' || !j.expires_at) return false
        const t = new Date(j.expires_at).getTime()
        return t >= now && t <= soonCutoff
      })
      .filter((j) => {
        if (!q) return true
        return (
          (j.title || '').toLowerCase().includes(q) ||
          (j.city || '').toLowerCase().includes(q) ||
          (j.companies?.company_name || '').toLowerCase().includes(q)
        )
      })
  }, [jobs, search, statusFilter, expiringOnly])

  async function handleGenerateAllOg() {
    const publishedJobs = jobs.filter((j) => j.status === 'published')

    if (!publishedJobs.length) {
      showToast('Няма публикувани обяви.', 'error')
      return
    }

    if (!confirm(`Ще бъдат генерирани OG изображения за ${publishedJobs.length} публикувани обяви. Продължи?`)) {
      return
    }

    setGeneratingOg(true)
    setOgProgress({ current: 0, total: publishedJobs.length })

    let success = 0
    let failed = 0

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        showToast('Сесията е изтекла. Влез отново.', 'error')
        return
      }

      for (let i = 0; i < publishedJobs.length; i++) {
        const job = publishedJobs[i]

        try {
          const { error } = await supabase.functions.invoke('generate-og-image', {
            body: { jobId: job.id },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })

          if (error) {
            console.error(`OG generation failed for ${job.id}:`, error)
            failed++
          } else {
            success++
          }
        } catch (err) {
          console.error(`OG generation failed for ${job.id}:`, err)
          failed++
        }

        setOgProgress({
          current: i + 1,
          total: publishedJobs.length,
        })
      }

      if (failed === 0) {
        showToast(`Готово! Генерирани са ${success} OG изображения.`, 'success')
      } else {
        showToast(`Готово: ${success} генерирани, ${failed} неуспешни.`, 'error')
      }
    } finally {
      setGeneratingOg(false)
    }
  }

  async function handleClose(job) {
    if (!confirm(`Затваряне на "${job.title}" — вече няма да се показва публично. Продължи?`)) return

    const { error } = await supabase
      .from('job_listings')
      .update({ status: 'closed' })
      .eq('id', job.id)

    if (error) {
      showToast('Грешка при затваряне: ' + error.message, 'error')
      return
    }

    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'closed' } : j)))
    showToast('Обявата е затворена.', 'success')
  }

  if (jobs === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header" style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
        <div>
          <p className="dashboard-eyebrow">Администрация</p>
          <h1 className="dashboard-title">Всички обяви ({filtered.length}{filtered.length !== jobs.length ? ` от ${jobs.length}` : ''})</h1>
        </div>
      </div>

      <div style={{marginBottom: '2rem'}}>
        <button
          className="btn-secondary"
          onClick={handleGenerateAllOg}
          disabled={generatingOg}
        >
          {generatingOg
            ? `Генериране ${ogProgress.current}/${ogProgress.total}...`
            : `Генерирай OG (${jobs.filter((j) => j.status === 'published').length})`}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          type="text"
          className="admin-search-input"
          style={{ flex: '1 1 260px', marginBottom: 0 }}
          placeholder="Търси по заглавие, град или фирма..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-status-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Всички статуси</option>
          <option value="draft">Чернови</option>
          <option value="published">Публикувани</option>
          <option value="closed">Затворени</option>
          <option value="expired">Изтекли</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={expiringOnly} onChange={(e) => setExpiringOnly(e.target.checked)} />
          Изтичат до 3 дни
        </label>
      </div>

      <div className="blog-admin-list">
        {filtered.map((job) => (
          <div key={job.id} className={`tier-card-${job.tier} job-admin-row`}>
            <div>
              <p className="blog-admin-row-title">
                <span className={`blog-status-badge ${STATUS_BADGE_CLASS[job.status] || 'blog-status-badge--draft'}`}>
                  {STATUS_LABEL[job.status] || job.status}
                </span>
                {job.title}
              </p>
              <div className="blog-admin-row-meta">
                {job.companies?.company_name || '(без фирма)'} · гр. {job.city || '—'} · {job.sector || 'без сектор'} ·{' '}
                {job.salary ? `${job.salary}${job.salary_max ? `–${job.salary_max}` : ''}€${!job.salary_visible ? ' (скрита)' : ''}` : 'без заплата'}
              </div>
              <div className="blog-admin-row-meta" style={{ marginTop: '0.2rem' }}>
                {job.expires_at
                  ? `изтича на ${new Date(job.expires_at).toLocaleDateString('bg-BG')}`
                  : 'без дата на изтичане'}
                {' · '}създадена {new Date(job.created_at).toLocaleDateString('bg-BG')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              {job.slug && (
                <a
                  href={`${JOBS_SITE_URL}/jobs/${job.slug}-${job.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ textDecoration: 'none' }}
                >
                  Виж
                </a>
              )}
              {(job.status === 'published' || job.status === 'draft') && (
                <button className="btn-secondary" onClick={() => handleClose(job)}>Затвори</button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p style={{ color: 'var(--color-text-muted)', padding: '1rem 0' }}>Няма обяви, отговарящи на филтъра.</p>}
      </div>
    </div>
  )
}
