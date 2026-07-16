import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import bannerImg from '../assets/background.jpg'
import './Home.css'

function HeroArt() {
  return (
    <svg width="320" height="280" viewBox="0 0 320 280" fill="none">
      <rect x="40" y="40" width="150" height="190" rx="16" fill="var(--color-surface)" stroke="var(--color-border)" />
      <rect x="60" y="70" width="70" height="10" rx="5" fill="var(--color-border)" />
      <rect x="60" y="90" width="100" height="8" rx="4" fill="var(--color-surface-raised)" />
      <rect x="60" y="106" width="100" height="8" rx="4" fill="var(--color-surface-raised)" />
      <rect x="60" y="122" width="60" height="8" rx="4" fill="var(--color-surface-raised)" />

      <rect x="130" y="60" width="150" height="190" rx="16" fill="var(--color-surface-raised)" stroke="var(--color-gold-soft)" strokeWidth="1.5" />
      <circle cx="165" cy="100" r="18" fill="var(--color-gold-soft)" stroke="var(--color-gold-soft)" strokeWidth="1.5" />
      <path d="M158 100l5 5 10-11" stroke="var(--color-text-muted)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="150" y="135" width="110" height="8" rx="4" fill="rgba(212,162,76,0.25)" />
      <rect x="150" y="151" width="80" height="8" rx="4" fill="var(--color-border)" />
      <rect x="150" y="175" width="110" height="34" rx="8" fill="var(--color-gold-soft)" />
      <text x="205" y="196" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="11" fill="var(--color-text-muted)">MATCH</text>
    </svg>
  )
}

export function Home() {
  const [logos, setLogos] = useState([])

  useEffect(() => {
    async function loadLogos() {
      const { data } = await supabase.from('partner_logos').select('*')
      setLogos(data || [])
    }
    loadLogos()
  }, [])

  return (
    <div>
      <div className="hero-banner">
        <img src={bannerImg} alt="Jobnet" />
        <div className="hero-banner-overlay">
          <div className="hero-banner-text">
            <p className="hero-banner-eyebrow">Jobnet</p>
            <h2 className="hero-banner-title">Работата те намира, не обратното.</h2>
          </div>
        </div>
      </div>

      <section className="hero">
        <div>
          <p className="hero-eyebrow">Платформа, в която работодателите намират служители</p>
          <h1 className="hero-title">Кандидатите казват <span>каква заплата</span> искат</h1>
          <p className="hero-sub">
            Без купища ирелевантни обяви. Попълваш едно CV с ясни критерии, а фирмите те намират точно теб — ако изискванията ви съвпадат.
          </p>
          <div className="hero-ctas">
            <Link to="/register?role=candidate" className="btn-primary" style={{ textDecoration: 'none' }}>Регистрирай се като кандидат</Link>
            <Link to="/register?role=company" className="btn-secondary" style={{ textDecoration: 'none' }}>Регистрирай се като фирма</Link>
          </div>
        </div>
        <div className="hero-art">
          <HeroArt />
        </div>
      </section>

      <section className="partners-section">
        <p className="partners-heading">Нашите доверени партньори</p>

        {logos.length === 0 && (
          <p className="partners-empty">Скоро тук ще виждате фирмите, които вече ползват Jobnet.</p>
        )}

        {logos.length > 0 && logos.length < 6 && (
          <div className="carousel-static">
            {logos.map((company) => (
              <img key={company.company_name} src={company.logo_url} alt={company.company_name} className="carousel-logo" />
            ))}
          </div>
        )}

        {logos.length >= 6 && (
          <div className="carousel-track-wrap">
            <div className="carousel-track">
              {[...logos, ...logos].map((company, i) => (
                <img key={`${company.company_name}-${i}`} src={company.logo_url} alt={company.company_name} className="carousel-logo" />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}