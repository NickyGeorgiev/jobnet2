import { useState, useEffect, } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { sectors } from '../data/sectors'
import { allCities } from '../data/citiesByRegion'
import { useToast } from './Toast'
import { useSeo } from '../useSeo'
import { seo } from '../seo'
import { JobListingCard } from './JobListingCard'
import { SectorSelect } from './SectorSelect'
import './JobListings.css'

const LEVEL_OPTIONS = [
  'Ниво работници',
  'Ниво експерти/специалисти',
  'Средно или ниско управленско ниво',
  'Висш мениджмънт',
]

const DURATION_OPTIONS = [
  'На пълен работен ден (8ч.)',
  'На непълен работен ден (4,6ч./почасово)',
  'Стажант/Freelancer',
]

const EMPTY_FILTERS = { keyword: '', city: '', sector: '', level: '', duration: '', minSalary: '', datePosted: '', salaryFilter: 'all' }
const PAGE_SIZE = 20

export function JobsBrowse() {
  useSeo(seo.jobs)
  const { session, profile } = useAuth()
  const { showToast } = useToast()
  const isCandidate = session && profile?.role === 'candidate'

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [jobs, setJobs] = useState(null)
  const [searching, setSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [appliedIds, setAppliedIds] = useState(new Set())
  const [savedIds, setSavedIds] = useState(new Set())

  useEffect(() => {
    handleSearch()
  }, [])

  useEffect(() => {
    if (isCandidate) loadCandidateState()
  }, [session, profile])

  async function handleSearch(overrideFilters) {
    if (searching) return
    const activeFilters = overrideFilters || filters
    setSearching(true)

    const results = await fetchJobsPage(activeFilters, 0)

    if (results.error) {
      showToast('Възникна грешка при търсенето. Опитай отново.', 'error')
      setJobs([])
      setHasMore(false)
    } else {
      setJobs(results.jobs)
      setHasMore(results.hasMore)
    }

    setSearching(false)
  }

  async function handleLoadMore() {
    if (loadingMore) return
    setLoadingMore(true)
    const results = await fetchJobsPage(filters, jobs.length)

    if (results.error) {
      showToast('Възникна грешка при зареждането. Опитай отново.', 'error')
    } else {
      setJobs((prev) => [...prev, ...results.jobs])
      setHasMore(results.hasMore)
    }

    setLoadingMore(false)
  }

  async function fetchJobsPage(activeFilters, offset) {
    let query = supabase
      .from('job_listings')
      .select('id, title, description, city, sector, status, level, duration, salary, salary_max, salary_visible, slug, published_at, expires_at, tier, tier_rank, company_id')
      .eq('status', 'published')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('tier_rank', { ascending: false })
      .order('published_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (activeFilters.keyword?.trim()) {
      const safeKeyword = activeFilters.keyword.trim().replace(/[,()%]/g, ' ')
      query = query.or(`title.ilike.%${safeKeyword}%,description.ilike.%${safeKeyword}%`)
    }

    if (activeFilters.city) query = query.eq('city', activeFilters.city)
    if (activeFilters.sector) query = query.eq('sector', activeFilters.sector)
    if (activeFilters.level) query = query.eq('level', activeFilters.level)
    if (activeFilters.duration) query = query.eq('duration', activeFilters.duration)
    if (activeFilters.minSalary) {
      const val = Number(activeFilters.minSalary)

      query = query
        .eq('salary_visible', true)
        .lte('salary', val)
        .or(`salary_max.gte.${val},and(salary_max.is.null,salary.gte.${val})`)
    }

    if (activeFilters.datePosted) {
      const daysMap = { today: 1, '3': 3, '5': 5, '10': 10 }
      const days = daysMap[activeFilters.datePosted]
      if (days) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('published_at', since)
      }
    }

    if (activeFilters.salaryFilter === 'visible') {
      query = query.eq('salary_visible', true)
    }

    const { data: jobsData, error } = await query

    if (error) {
      return { jobs: [], hasMore: false, error }
    }

    const list = jobsData || []

    const companyIds = [...new Set(list.map((j) => j.company_id))]
    let companiesById = {}
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('company_public_names')
        .select('id, company_name, logo_url')
        .in('id', companyIds)
      companiesById = Object.fromEntries((companies || []).map((c) => [c.id, c]))
    }

    return {
      jobs: list.map((job) => ({ ...job, company: companiesById[job.company_id] || null })),
      hasMore: list.length === PAGE_SIZE,
    }
  }

  async function loadCandidateState() {
    const [{ data: apps }, { data: saved }] = await Promise.all([
      supabase.from('job_applications').select('job_listing_id').eq('candidate_id', session.user.id),
      supabase.from('saved_jobs').select('job_listing_id').eq('candidate_id', session.user.id),
    ])
    setAppliedIds(new Set((apps || []).map((a) => a.job_listing_id)))
    setSavedIds(new Set((saved || []).map((s) => s.job_listing_id)))
  }

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

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="search-shell">
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Обяви за работа</h2>
      <p className="search-welcome">Филтрирай по каквото ти е важно — всички полета са незадължителни.</p>

      <div className="job-filters">
        <input
          className="input"
          type="text"
          placeholder="Търси по ключова дума"
          value={filters.keyword}
          onChange={(e) => updateFilter('keyword', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ gridColumn: '1 / -1' }}
        />

        <select className="input" value={filters.city} onChange={(e) => updateFilter('city', e.target.value)}>
          <option value="">Всички градове</option>
          {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <SectorSelect
          value={filters.sector}
          onChange={(val) => updateFilter('sector', val)}
          options={sectors}
          placeholder="Всички сектори"
          iconSize={25}
        />

        <select className="input" value={filters.level} onChange={(e) => updateFilter('level', e.target.value)}>
          <option value="">Всички нива</option>
          {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>

        <select className="input" value={filters.duration} onChange={(e) => updateFilter('duration', e.target.value)}>
          <option value="">Всякаква заетост</option>
          {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select className="input" value={filters.datePosted} onChange={(e) => updateFilter('datePosted', e.target.value)}>
          <option value="">Публикувани</option>
          <option value="today">Днес</option>
          <option value="3">Последните 3 дни</option>
          <option value="5">Последните 5 дни</option>
          <option value="10">Последните 10 дни</option>
        </select>

        <input
          className="input"
          type="number"
          placeholder="Заплата (€)"
          value={filters.minSalary}
          onChange={(e) => updateFilter('minSalary', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          onWheel={(e) => e.target.blur()}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="salaryFilter"
              checked={filters.salaryFilter === 'all'}
              onChange={() => updateFilter('salaryFilter', 'all')}
            />
            Всички обяви
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="salaryFilter"
              checked={filters.salaryFilter === 'visible'}
              onChange={() => updateFilter('salaryFilter', 'visible')}
            />
            Само с обявена заплата
          </label>
        </div>

        <button className="btn-primary" onClick={() => handleSearch()} disabled={searching}>
          {searching ? 'Търсене...' : 'Търси'}
        </button>

                {(filters.keyword || filters.city || filters.sector || filters.level || filters.duration || filters.minSalary || filters.datePosted || filters.salaryFilter !== 'all') && (
          <button className="btn-text-danger" onClick={() => { setFilters(EMPTY_FILTERS); handleSearch(EMPTY_FILTERS) }}>
            Изчисти филтрите
          </button>
        )}
      </div>

      {jobs === null && <p style={{ color: 'var(--color-text-muted)' }}>Зареждане...</p>}
      {jobs && jobs.length === 0 && <div className="no-results">Няма обяви, отговарящи на тези критерии.</div>}

      <div className="blog-admin-list" style={{ marginTop: '1.5rem' }}>
        {jobs && jobs.map((job) => (
          <JobListingCard
            key={job.id}
            job={job}
            isCandidate={isCandidate}
            isSaved={savedIds.has(job.id)}
            onToggleSave={handleToggleSave}
            isApplied={appliedIds.has(job.id)}
          />
        ))}
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button className="btn-secondary" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Зареждане...' : 'Зареди още'}
          </button>
        </div>
      )}
    </div>
  )
}
