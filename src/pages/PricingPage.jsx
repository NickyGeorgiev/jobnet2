import { Link } from 'react-router-dom'
import { useSeo } from '../useSeo'
import { seo } from '../seo';
import stateCreditSvg from '../assets/state-credit.svg'

const TIERS = [
  {
    value: 'free',
    label: 'Безплатна',
    price: null,
    icon: '',
    perks: ['Обявата е валидна 30 дни'],
  },
  {
    value: 'silver',
    label: 'Silver',
    price: (
      <>
        10 € / 10 <img src={stateCreditSvg} alt="SC" style={{ width: 18, height: 18, verticalAlign: 'bottom' }} />
      </>
    ),
    icon: '✦',
    perks: ['Показва се над всички безплатни обяви', 'Сребърен бадж на обявата', '30 дни повишена видимост'],
  },
  {
    value: 'gold',
    label: 'Gold',
    price: (
      <>
        20 € / 20 <img src={stateCreditSvg} alt="SC" style={{ width: 18, height: 18, verticalAlign: 'bottom' }} />
      </>
    ),
    icon: '✦',
    perks: ['Показва се над Silver и безплатните обяви', 'Златен бадж на обявата', '30 дни повишена видимост'],
  },
  {
    value: 'platinum',
    label: 'Platinum',
    price: (
      <>
        50 € / 50 <img src={stateCreditSvg} alt="SC" style={{ width: 18, height: 18, verticalAlign: 'bottom' }} />
      </>
    ),
    icon: '❖',
    perks: ['Показва се над Gold, Silver и безплатните', 'Платинен бадж на обявата', '30 дни повишена видимост'],
  },
  {
    value: 'diamond',
    label: 'Diamond',
    price: (
      <>
        100 € / 100 <img src={stateCreditSvg} alt="SC" style={{ width: 18, height: 18, verticalAlign: 'bottom' }} />
      </>
    ),
    icon: '💎',
    perks: ['Винаги най-отгоре в списъка с обяви', 'Диамантен бадж на обявата', '30 дни повишена видимост'],
  },
]

const CREDIT_BUNDLES = [
  { credits: 250, price: 225, save: 25 },
  { credits: 500, price: 435, save: 65 },
  { credits: 1000, price: 840, save: 160 },
  { credits: 1500, price: 1230, save: 270 },
  { credits: 2500, price: 1975, save: 525 },
]

export function PricingPage() {
  useSeo(seo.pricing)

  return (
    <div className="search-shell pricing-page">
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Цени</h2>
      <p className="pricing-intro">
        Публикуването на обяви в Jobstate е и ще си остане <strong>напълно безплатно</strong>.
        Платените нива са по избор — те не отключват допълнителни функции, а само подсилват
        <strong> видимостта</strong> на обявата за 30 дни: показват я по-нагоре в списъка и я
        отличават с цветен бадж, за да я забележат повече кандидати по-бързо.
      </p>

      <h3 className="pricing-section-title">Как се подреждат обявите</h3>
      <p className="pricing-explainer">
        Списъкът с обяви винаги показва <strong>Diamond → Platinum → Gold → Silver → Безплатни</strong>,
        а вътре във всяко ниво — най-новите публикувани обяви са отгоре. По-високото ниво не "измества"
        обявата ти завинаги — важи точно 30 дни, докато самата обява е активна.
      </p>

      <h3 className="pricing-section-title">Нива на обявите</h3>
      <div className="pricing-tier-grid">
        {TIERS.map((t) => (
          <div key={t.value} className={`pricing-tier-card pricing-tier-card--${t.value}`}>
            <p className={`pricing-tier-icon pricing-tier-icon--${t.value}`}>
              {t.icon}{t.label}
            </p>
            <p className="pricing-tier-price">{t.price}</p>
            <ul className="pricing-tier-perks">
              {t.perks.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <h3 className="pricing-section-title" style={{ marginTop: '3rem' }}>
        State Credits <img src={stateCreditSvg} alt="SC" style={{ width: 18, height: 18, verticalAlign: 'middle' }} />
      </h3>
      <p className="pricing-explainer">
        State Credits (SC) са вътрешна валута на Jobstate — купуваш ги веднъж на едро и после ги ползваш
        за плащане на нива за обяви, вместо да плащаш с карта всеки път. Колкото по-голям пакет купиш,
        толкова по-евтин излиза всеки отделен кредит.
      </p>
      <div className="pricing-credit-grid">
        {CREDIT_BUNDLES.map((b) => {
          const perCredit = (b.price / b.credits).toFixed(2)
          return (
            <div key={b.credits} className="pricing-credit-card">
              <p className="pricing-credit-amount">{b.credits} <span><img src={stateCreditSvg} alt="SC" style={{ width: 18, height: 18 }} /></span></p>
              <p className="pricing-credit-price">{b.price} €</p>
              <p className="pricing-credit-detail">{perCredit} € / кредит</p>
              <p>спестяваш {b.save} €</p>
            </div>
          )
        })}
      </div>

      <h3 className="pricing-section-title" style={{ marginTop: '3rem' }}>Често задавани въпроси</h3>
      <div className="pricing-faq">
        <div className="pricing-faq-item">
          <p className="pricing-faq-q">Мога ли да ъпгрейдна ниво по-късно?</p>
          <p className="pricing-faq-a">Да — от "Моите обяви" избираш "Ъпгрейд ниво" по всяко време, докато обявата е активна. Валидността се рестартира на 30 дни от момента на плащането.</p>
        </div>
        <div className="pricing-faq-item">
          <p className="pricing-faq-q">Какво се случва след 30 дни?</p>
          <p className="pricing-faq-a">Обявата изтича автоматично и спира да е публично видима, независимо от нивото ѝ. Можеш лесно да я дублираш и публикуваш наново.</p>
        </div>
        <div className="pricing-faq-item">
          <p className="pricing-faq-q">Получавам ли фактура?</p>
          <p className="pricing-faq-a">Да, генерира се автоматично след успешно плащане и е достъпна в профила ти.</p>
        </div>
      </div>

      <p style={{ color: 'var(--color-text-muted)', marginTop: '2.5rem', fontSize: '0.85rem' }}>
        Плащанията се обработват сигурно през Stripe. Въпроси — <Link to="/contact" style={{ color: 'var(--color-teal)' }}>свържи се с нас</Link>.
      </p>
    </div>
  )
}