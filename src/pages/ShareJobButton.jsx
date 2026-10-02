import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FaFacebook, FaLinkedin, FaViber } from 'react-icons/fa6'
import { FiShare2, FiLink, FiCheck } from 'react-icons/fi'

const JOBS_SITE_URL = import.meta.env.VITE_JOBS_SITE_URL || 'https://jobs.jobstate.net'

function buildShareUrl(job, source) {
  const base = `${JOBS_SITE_URL}/jobs/${job.slug}-${job.id}`
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: 'share_button',
    utm_campaign: 'job_share',
  })
  return `${base}?${params.toString()}`
}

// Бутон „Сподели" с изкачащо меню (Facebook / Viber / LinkedIn / копирай линк).
// Рендерира менюто през portal в <body>, защото картата (.job-admin-row) има
// overflow:hidden и иначе менюто би се отрязало.
export function ShareJobButton({ job }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [coords, setCoords] = useState(null)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)

  function togglePopover(e) {
    e.stopPropagation()
    if (!open) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        left: rect.left + rect.width / 2,
        top: rect.top,
      })
    }
    setOpen((o) => !o)
  }

  useEffect(() => {
    if (!open) return

    function handleOutside(e) {
      if (triggerRef.current?.contains(e.target)) return
      if (popoverRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function handleScrollOrResize() {
      setOpen(false)
    }

    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open])

  function handleOptionClick(e) {
    e.stopPropagation()
    setOpen(false)
  }

  async function handleCopy(e) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(buildShareUrl(job, 'copy_link'))
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setOpen(false)
      }, 1200)
    } catch {
      setOpen(false)
    }
  }

  const title = encodeURIComponent(job.title)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="job-card-share-icon"
        onClick={togglePopover}
        title="Сподели"
        aria-label="Сподели обявата"
      >
        <FiShare2 />
      </button>

      {open && coords && createPortal(
        <div
          ref={popoverRef}
          className="job-card-share-popover"
          style={{ left: coords.left, top: coords.top }}
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(buildShareUrl(job, 'facebook'))}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOptionClick}
            className="job-card-share-option"
            title="Сподели във Facebook"
          >
            <FaFacebook />
          </a>
          <a
            href={`viber://forward?text=${title}%20${encodeURIComponent(buildShareUrl(job, 'viber'))}`}
            onClick={handleOptionClick}
            className="job-card-share-option"
            title="Сподели във Viber"
          >
            <FaViber />
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(buildShareUrl(job, 'linkedin'))}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOptionClick}
            className="job-card-share-option"
            title="Сподели в LinkedIn"
          >
            <FaLinkedin />
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="job-card-share-option"
            title="Копирай линка"
          >
            {copied ? <FiCheck /> : <FiLink />}
          </button>
        </div>,
        document.body
      )}
    </>
  )
}
