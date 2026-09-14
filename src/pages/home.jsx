import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useDocumentTitle } from '../useDocumentTitle'
import { useFreeMode } from '../FreeModeContext'
import bannerDesktop from '../assets/background-desktop.avif'
import bannerMobile from '../assets/background-mobile.avif'
import { useSeo } from '../useSeo'
import { seo } from '../seo'
import heroArt from '../assets/hero.svg'
import { MdManageSearch } from "react-icons/md";
import './Home.css'

// function HeroArt() {
//   return (
//     <svg width="320" height="280" viewBox="0 0 320 280" fill="none">
//       <rect x="40" y="40" width="150" height="190" rx="16" fill="var(--color-surface)" stroke="var(--color-border)" />
//       <rect x="60" y="70" width="70" height="10" rx="5" fill="var(--color-border)" />
//       <rect x="60" y="90" width="100" height="8" rx="4" fill="var(--color-surface-raised)" />
//       <rect x="60" y="106" width="100" height="8" rx="4" fill="var(--color-surface-raised)" />
//       <rect x="60" y="122" width="60" height="8" rx="4" fill="var(--color-surface-raised)" />

//       <rect x="130" y="60" width="150" height="190" rx="16" fill="var(--color-surface-raised)" stroke="var(--color-gold-soft)" strokeWidth="1.5" />
//       <circle cx="165" cy="100" r="18" fill="var(--color-gold-soft)" stroke="var(--color-gold-soft)" strokeWidth="1.5" />
//       <path d="M158 100l5 5 10-11" stroke="var(--color-text)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
//       <rect x="150" y="135" width="110" height="8" rx="4" fill="rgba(212,162,76,0.25)" />
//       <rect x="150" y="151" width="80" height="8" rx="4" fill="var(--color-border)" />
//       <rect x="150" y="175" width="110" height="34" rx="8" fill="var(--color-gold-soft)" />
//       <text x="205" y="196" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="11" fill="var(--color-text)">MATCH</text>
//     </svg>
//   )
// }

export function Home() {
  useSeo(seo.home)
  useDocumentTitle(null)
  const { freeMode } = useFreeMode()
  const [logos, setLogos] = useState([])

  useEffect(() => {
    async function loadLogos() {
      if (freeMode) {
        const { data } = await supabase
          .from('company_directory')
          .select('id, company_name, logo_url')
          .not('logo_url', 'is', null)
        setLogos(data || [])
      } else {
        const { data } = await supabase.from('partner_logos').select('*')
        setLogos(data || [])
      }
    }
    loadLogos()
  }, [freeMode])

  return (
    <div>
      <div className="hero-banner">
        <picture>
          <source media="(max-width: 700px)" srcSet={bannerMobile} />
          <img src={bannerDesktop} alt="Jobstate" width="1200" height="393" fetchPriority="high" />
        </picture>
        <div className="hero-banner-overlay">
          <div className="hero-banner-text">
            <p className="hero-banner-eyebrow">Jobstate - Открий нови възможности</p>
          </div>
          <button className="btn-192">
            <MdManageSearch size={30}/>
            <Link to="/jobs">Разгледай обявите за работа</Link>
            <span className="bdr-left"></span>
            <span className="bdr-top"></span>
            <span className="bdr-right"></span>
            <span className="bdr-bottom"></span>
          </button>
          <div className="hero-banner-ctas">
            <Link to="/register?role=candidate" className="btn-primary" style={{ textDecoration: 'none' }}>Регистрирай се като кандидат</Link>
            <Link to="/register?role=company" className="btn-94" style={{ textDecoration: 'none' }}><span>Регистрирай се като фирма</span></Link>
          </div>
        </div>
      </div>

      <section className="hero">
        <div>
          <p className="hero-eyebrow">Работата, която търсиш, може да те намери първа</p>

          <h1 className="hero-title">Защо да избереш JobState?</h1>

          <p className="hero-sub">
            ✅ Казваш ни каква работа търсиш – град, сектор, ниво, тип заетост и желано възнаграждение.
          </p>

          <p className="hero-sub">
            ✅ Когато бъде публикувана обява, която отговаря на твоите изисквания, получаваш известие по имейл.
          </p>

          <p className="hero-sub">
            ✅ Не е нужно постоянно да проверяваш за нови възможности – ние ще ти кажем, когато се появи подходяща.
          </p>

          <p className="hero-sub">
            ✅ Разглеждаш всички публикувани обяви, филтрираш ги по твоите критерии и кандидатстваш директно.
          </p>

          <p className="hero-sub">
            ✅ Следиш кандидатурите си на едно място и знаеш какво се случва с тях.
          </p>
        </div>


        <div className="hero-art">
          {/* <HeroArt /> */}
        <img src={heroArt} alt="Jobstate" />
        </div>
      </section>

      <section className="partners-section">
        <Link to="/companies" style={{ textDecoration: 'none' }}>
          <p className="partners-heading">Нашите доверени партньори</p>
        </Link>

        {logos.length === 0 && (
          <p className="partners-empty">Скоро тук ще виждате фирмите, които вече ползват Jobstate</p>
        )}

        {logos.length > 0 && logos.length < 6 && (
          <div className="carousel-static">
            {logos.map((company) => (
              <Link key={company.company_name} to={company.id ? `/companies/${company.id}` : '/companies'}>
                <img src={company.logo_url} alt={company.company_name} className="carousel-logo" />
              </Link>
            ))}
          </div>
        )}

        {logos.length >= 6 && (
          <div className="carousel-track-wrap">
            <div className="carousel-track">
              {[...logos, ...logos].map((company, i) => (
                <Link key={`${company.company_name}-${i}`} to={company.id ? `/companies/${company.id}` : '/companies'}>
                  <img src={company.logo_url} alt={company.company_name} className="carousel-logo" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}