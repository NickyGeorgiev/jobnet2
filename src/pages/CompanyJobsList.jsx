import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { Spinner } from './Spinner'
import { useSeo } from '../useSeo'
import { useToast } from './Toast'
import { JobListingCard } from './JobListingCard'

export function CompanyJobsList() {
  const { id } = useParams()
  const { session, profile } = useAuth()
  const { showToast } = useToast()
  const isCandidate = session && profile?.role === 'candidate'

  const [company, setCompany] = useState(null)
  const [jobs, setJobs] = useState(null)
  const [appliedIds, setAppliedIds] = useState(new Set())
  const [savedIds, setSavedIds] = useState(new Set())

  useSeo({
    title: company ? `Всички обяви — ${company.company_name}` : undefined,
    description: company ? `Всички активни обяви за работа от ${company.company_name} в Jobstate.` : undefined,
  })

  useEffect(() => {
    async function load() {
      const [{ data: companyData }, { data: jobsData, error }] = await Promise.all([
        supabase.from('company_public_names').select('id, company_name, logo_url').eq('id', id).single(),
        supabase
          .from('job_listings')
          .select('id, title, city, sector, slug, tier, tier_rank, salary_visible, salary, salary_max, published_at, expires_at, status, company_id')
          .eq('company_id', id)
          .eq('status', 'published')
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('tier_rank', { ascending: false })
          .order('published_at', { ascending: false }),
      ])

      if (error) {
        showToast('Грешка при зареждане на обявите.', 'error')
      }

      setCompany(companyData)
      setJobs((jobsData || []).map((job) => ({ ...job, company: companyData })))
    }
    load()
  }, [id])

  useEffect(() => {
    if (!isCandidate) return

    async function loadCandidateState() {
      const [{ data: apps }, { data: saved }] = await Promise.all([
        supabase.from('job_applications').select('job_listing_id').eq('candidate_id', session.user.id),
        supabase.from('saved_jobs').select('job_listing_id').eq('candidate_id', session.user.id),
      ])
      setAppliedIds(new Set((apps || []).map((a) => a.job_listing_id)))
      setSavedIds(new Set((saved || []).map((s) => s.job_listing_id)))
    }
    loadCandidateState()
  }, [session, profile])

  async function handleToggleSave(jobId) {
    if (!isCandidate) return

    if (savedIds.has(jobId)) {
      const { error } = await supabase.from('saved_jobs').delete().eq('candidate_id', session.user.id).eq('job_listing_id', jobId)
      if (error) {
        showToast('Грешка при премахване от любими.', 'error')
        return
      }
      setSavedIds((prev) => {
        const next = new Set(prev)
        next.delete(jobId)
        return next
      })
    } else {
      const { error } = await supabase.from('saved_jobs').insert({ candidate_id: session.user.id, job_listing_id: jobId })
      if (error) {
        showToast('Грешка при добавяне в любими.', 'error')
        return
      }
      setSavedIds((prev) => new Set(prev).add(jobId))
    }
  }

  if (jobs === null) return <Spinner label="Зареждам обявите..." />

  return (
    <div className="search-shell">
      <Link to={`/companies/${id}`} className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>
        ← Профил на фирмата
      </Link>

      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
        Всички обяви {company ? `— ${company.company_name}` : ''}
      </h2>
      <p className="search-welcome">{jobs.length} активни {jobs.length === 1 ? 'обява' : 'обяви'}.</p>

      {jobs.length === 0 && <div className="no-results">Няма активни обяви в момента.</div>}

      <div className="blog-admin-list" style={{ marginTop: '1.5rem' }}>
        {jobs.map((job) => (
          <JobListingCard
            key={job.id}
            job={job}
            showCompany={false}
            isCandidate={isCandidate}
            isSaved={savedIds.has(job.id)}
            onToggleSave={handleToggleSave}
            isApplied={appliedIds.has(job.id)}
          />
        ))}
      </div>
    </div>
  )
}
