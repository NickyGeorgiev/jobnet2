import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Spinner } from './Spinner'
import { useSeo } from '../useSeo'
import { JobListingCard } from './JobListingCard'
import { SectorIcon } from './SectorIcon'
import { FaLocationDot } from "react-icons/fa6";
import './CompanyProfilePublic.css'

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

const FacebookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

const LinkedinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
)

const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
)

const MobileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 1H7C5.895 1 5 1.895 5 3v18c0 1.105.895 2 2 2h10c1.105 0 2-.895 2-2V3c0-1.105-.895-2-2-2zm0 18H7V5h10v14zm-5 3a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 12 22z" />
  </svg>
)

function getVideoEmbedUrl(url) {
  if (!url) return null
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return null
}

function isSafeUrl(url) {
  if (!url) return false
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function CompanyProfilePublic() {
  const { id } = useParams()
  const [company, setCompany] = useState(null)
  const [jobs, setJobs] = useState([])
  const [totalJobsCount, setTotalJobsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useSeo({
    title: company?.company_name,
    description: company
      ? (company.bio ? company.bio.slice(0, 160) : `Профил на ${company.company_name} в Jobstate — ${company.sector || 'фирма'}, обяви за работа и повече.`)
      : undefined,
  })

  useEffect(() => {
    async function load() {
      const { data: companyData } = await supabase
        .from('company_public_names')
        .select('*')
        .eq('id', id)
        .single()
      setCompany(companyData)

      const { data: jobsData, count } = await supabase
        .from('job_listings')
        .select('id, title, city, sector, slug, tier, tier_rank, salary_visible, salary, salary_max, published_at, expires_at, status', { count: 'exact' })
        .eq('company_id', id)
        .eq('status', 'published')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('tier_rank', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(6)
      setJobs((jobsData || []).map((job) => ({ ...job, company: companyData })))
      setTotalJobsCount(count || 0)

      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <Spinner label="Зареждам профила..." />

  if (!company) {
    return (
      <div className="company-public-shell">
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '4rem 1rem' }}>
          Този фирмен профил не е намерен.
        </p>
      </div>
    )
  }

  const embedUrl = getVideoEmbedUrl(company.video_url)
  const socials = [
    { url: company.social_website, label: 'Уебсайт', icon: <GlobeIcon /> },
    { url: company.social_facebook, label: 'Facebook', icon: <FacebookIcon /> },
    { url: company.social_linkedin, label: 'LinkedIn', icon: <LinkedinIcon /> },
    { url: company.social_instagram, label: 'Instagram', icon: <InstagramIcon /> },
  ]
    .filter((s) => isSafeUrl(s.url))
    .concat([
      company.contact_phone ? { url: `tel:${company.contact_phone}`, icon: <MobileIcon />, label: `${company.contact_phone}` } : null,
      company.contact_email ? { url: `mailto:${company.contact_email}`, label: `✉ ${company.contact_email}` } : null,
    ].filter(Boolean))

  const companyJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.company_name,
    url: `https://jobstate.net/companies/${company.id}`,
    logo: company.logo_url || undefined,
    description: company.bio || undefined,
    address: company.contact_address ? { '@type': 'PostalAddress', streetAddress: company.contact_address } : undefined,
    sameAs: [company.social_facebook, company.social_linkedin, company.social_instagram, company.social_website].filter(Boolean),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(companyJsonLd) }} />

      <div className="company-public-shell">
        <div className="company-public-banner" style={company.banner_url ? { backgroundImage: `url(${company.banner_url})` } : undefined}>
          <div className="company-public-banner-overlay" />
        </div>

        <div className="company-public-header">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.company_name} className="company-public-logo" />
          ) : (
            <div className="company-public-logo-placeholder">🏢</div>
          )}
          <div>
            <h1 className="company-public-name">{company.company_name}</h1>
            {company.sector && (
              <p className="company-public-sector">
                <SectorIcon sector={company.sector} /> {company.sector}
              </p>
            )}
          </div>
        </div>

        <div className="company-public-facts">
          {company.founded_year && <div><span className="fact-value">{company.founded_year}</span><span className="fact-label">Основана</span></div>}
          {company.employee_count && <div><span className="fact-value">{company.employee_count}</span><span className="fact-label">Служители</span></div>}
          {company.locations_count && <div><span className="fact-value">{company.locations_count}</span><span className="fact-label">Обекти</span></div>}
        </div>

        {socials.length > 0 && (
          <div className="company-public-socials">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {s.icon}
                <span>{s.label}</span>
              </a>
            ))}
          </div>
        )}

        {company.contact_address && (
          <div className="company-public-map-section">
            <p className="company-public-address"><FaLocationDot /> {company.contact_address}</p>
            <div className="company-public-map-embed">
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(company.contact_address)}`}
                title="Карта с местоположението на фирмата"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        )}

        {company.bio && <p className="company-public-bio">{company.bio}</p>}

        {embedUrl && (
          <div className="company-public-video">
            <iframe src={embedUrl} title="Видео на фирмата" allowFullScreen />
          </div>
        )}

        {company.video_urls?.length > 0 && (
          <div className="company-public-section">
            <h2>Още видеа</h2>
            <div className="company-public-video-grid">
              {company.video_urls.map((url, i) => {
                const embed = getVideoEmbedUrl(url)
                if (!embed) return null
                return (
                  <div key={i} className="company-public-video company-public-video--small">
                    <iframe src={embed} title={`Видео ${i + 1}`} allowFullScreen />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {company.why_work_here && (
          <div className="company-public-section">
            <h2>Защо да избереш нас?</h2>
            <p className="company-public-bio">{company.why_work_here}</p>
          </div>
        )}

        {company.perks?.length > 0 && (
          <div className="company-public-section">
            <h2>Придобивки</h2>
            <div className="company-public-tag-grid">
              {company.perks.map((p, i) => <span key={i} className="company-public-tag">✓ {p}</span>)}
            </div>
          </div>
        )}

        {company.values?.length > 0 && (
          <div className="company-public-section">
            <h2>Ценности</h2>
            <div className="company-public-tag-grid">
              {company.values.map((v, i) => <span key={i} className="company-public-tag company-public-tag--value">★ {v}</span>)}
            </div>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="company-public-section">
            <h2>Активни обяви</h2>
            <div className="blog-admin-list">
              {jobs.map((job) => (
                <JobListingCard key={job.id} job={job} showCompany={false} />
              ))}
            </div>
            {totalJobsCount > jobs.length && (
              <Link
                to={`/companies/${id}/jobs`}
                className="btn-secondary"
                style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'none', alignI: 'center' }}
              >
                Виж всички обяви ({totalJobsCount})
              </Link>
            )}
          </div>
        )}

        <Link to="/companies" className="btn-secondary" style={{ display: 'inline-block', marginTop: '2rem', textDecoration: 'none' }}>
          ← Всички фирми
        </Link>
      </div>
    </>
  )
}
