import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { useSeo } from '../useSeo'
import { seo } from '../seo'
import { JobListingCard } from './JobListingCard'
import './JobListings.css'

export function MySavedJobs() {
  useSeo(seo.savedJobs)
  const { session } = useAuth()
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    if (session) loadSaved()
  }, [session])

  async function loadSaved() {
    const { data } = await supabase
      .from('saved_jobs')
      .select('id, created_at, job_listings(id, title, city, sector, slug, status, salary, salary_max, salary_visible, tier, tier_rank, published_at, company_id)')
      .eq('candidate_id', session.user.id)
      .order('created_at', { ascending: false })

    const list = data || []

    const companyIds = [...new Set(list.map((s) => s.job_listings?.company_id).filter(Boolean))]
    let companiesById = {}
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('company_public_names')
        .select('id, company_name, logo_url')
        .in('id', companyIds)
      companiesById = Object.fromEntries((companies || []).map((c) => [c.id, c]))
    }

    setSaved(
      list.map((item) => ({
        ...item,
        job: item.job_listings
          ? { ...item.job_listings, company: companiesById[item.job_listings.company_id] || null }
          : null,
      }))
    )
  }

  async function handleRemove(savedId) {
    await supabase.from('saved_jobs').delete().eq('id', savedId)
    setSaved((prev) => prev.filter((s) => s.id !== savedId))
  }

  if (saved === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <p className="dashboard-eyebrow">Кандидат</p>
        <h1 className="dashboard-title">Любими обяви</h1>
      </div>

      <div className="blog-admin-list">
        {saved.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)' }}>
            Все още нямаш запазени обяви. Натисни ★ на обява, за да я добавиш тук.
          </p>
        )}

        {saved.map((item) =>
          item.job ? (
            <div key={item.id} style={{ position: 'relative' }}>
              <JobListingCard job={item.job} isSaved={true} onToggleSave={() => handleRemove(item.id)} isCandidate={true} />
            </div>
          ) : (
            <div key={item.id} className="job-admin-row">
              <div>
                <p className="blog-admin-row-title">Обявата вече не съществува</p>
              </div>
              <div className="job-listing-row-actions">
                <button className="btn-text-danger" onClick={() => handleRemove(item.id)}>
                  Премахни от любими
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
