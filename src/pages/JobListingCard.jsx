import { SectorIcon } from './SectorIcon'
import { FaLocationDot } from "react-icons/fa6"
import { SiClockify } from "react-icons/si"
import { BsCalendarDay } from "react-icons/bs"


const JOBS_SITE_URL = import.meta.env.VITE_JOBS_SITE_URL || 'https://jobs.jobstate.net'

function formatRelativeDate(dateString) {
  if (!dateString) return ''
  const diffMs = Date.now() - new Date(dateString).getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))

  if (hours < 1) return 'преди по-малко от час'
  if (hours < 24) return `преди ${hours} ${hours === 1 ? 'час' : 'часа'}`

  const days = Math.floor(hours / 24)
  if (days < 7) return `преди ${days} ${days === 1 ? 'ден' : 'дни'}`

  return new Date(dateString).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' })
}

export function JobListingCard({
  job,
  showCompany = true,
  isCandidate = false,
  isSaved = false,
  onToggleSave,
}) {
  function handleOpen() {
    window.open(`${JOBS_SITE_URL}/jobs/${job.slug}-${job.id}`, '_blank', 'noopener,noreferrer')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleOpen()
    }
  }

  return (
    <div
      className={`job-admin-row ${job.tier && job.tier !== 'free' ? `tier-card-${job.tier}` : ''
        } ${job.status === 'expired' ? 'job-admin-row--expired' : ''}`}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      style={{ cursor: 'pointer', position: 'relative' }}
    >
      {isCandidate && onToggleSave && (
        <button
          className="job-card-fav-icon"
          onClick={(e) => { e.stopPropagation(); onToggleSave(job.id) }}
          title={isSaved ? 'Премахни от любими' : 'Добави в любими'}
          aria-label={isSaved ? 'Премахни от любими' : 'Добави в любими'}
        >
          {isSaved ? '★' : '☆'}
        </button>
      )}

      <div className="job-card-header-row">
        {job.company?.logo_url ? (
          <img src={job.company.logo_url} alt={job.company.company_name} className="job-card-logo-small" />
        ) : (
          <div className="job-card-logo-placeholder job-card-logo-placeholder--small">
            {job.company?.company_name ? job.company.company_name[0].toUpperCase() : '🏢'}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="job-card-top-row">
            <span style={{ fontWeight: 'bold' }}>{job.title}</span>

            {job.tier && job.tier !== 'free' && (
              <span className={`tier-badge tier-badge--${job.tier}`}>
                {job.tier === 'silver' && '✦ Silver'}
                {job.tier === 'gold' && '✦ Gold'}
                {job.tier === 'platinum' && '❖ Platinum'}
                {job.tier === 'diamond' && '💎 Diamond'}
              </span>
            )}
          </div>

          <p className="job-card-company-line">
            {showCompany && (job.company?.company_name || 'Фирма')}
            {job.published_at && (
              <>
                {showCompany &&  <BsCalendarDay style={{ fontSize: '17px', marginLeft: '6px', marginRight: '4px' }}/>} 
                {formatRelativeDate(job.published_at)}
              </>
            )}
          </p>
        </div>
      </div>

      <hr className="job-card-divider" />

      {job.description && (
        <p className="job-card-description">{job.description}</p>
      )}

      <div className="job-card-bottom-row">
        <div className="job-card-tags">
          {job.city && <span className="job-pill"><FaLocationDot style={{color: 'var(--color-danger)'}}/> {job.city}</span>}
          {job.sector && (
            <span className="job-pill">
              <SectorIcon sector={job.sector} /> {job.sector}
            </span>
          )}
          {job.duration && <span className="job-pill"><SiClockify /> {job.duration}</span>}
        </div>

        {job.salary_visible && job.salary && (
          <span className="job-card-salary">
            {job.salary_max && job.salary_max !== job.salary
              ? `${job.salary} - ${job.salary_max} € нето/месец`
              : `${job.salary} € нето/месец`}
          </span>
        )}
      </div>

      {job.status !== 'published' && (
        <span className="job-card-status-pill job-card-status-pill--closed">Обявата е затворена</span>
      )}
    </div>
  )
}
