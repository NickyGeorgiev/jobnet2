import { useState } from 'react'
import { CheckoutButton } from './CheckoutButton'

const MONTHLY_PRICE = 35
const YEARLY_TOTAL = 300
const YEARLY_PER_MONTH = (YEARLY_TOTAL / 12).toFixed(2)
const DISCOUNT_PERCENT = Math.round((1 - YEARLY_PER_MONTH / MONTHLY_PRICE) * 100)

export function PlanPicker() {
  const [plan, setPlan] = useState('yearly')

  const isYearly = plan === 'yearly'

  return (
    <div className="plan-picker">
      <select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>
        <option value="yearly">1 година — {YEARLY_TOTAL}€ (обвързване)</option>
        <option value="monthly">1 месец — {MONTHLY_PRICE}€ (без обвързване)</option>
      </select>

      {isYearly ? (
        <>
          <div className="plan-price-row">
            <span className="plan-price-old">{MONTHLY_PRICE}€</span>
            <span className="plan-price-new">{YEARLY_PER_MONTH}€</span>
            <span className="plan-discount-badge">-{DISCOUNT_PERCENT}%</span>
          </div>
          <p className="plan-price-sub">на месец. Таксуването е веднъж годишно</p>
          <span className="plan-savings-badge">
            Спестявате {(MONTHLY_PRICE * 12 - YEARLY_TOTAL).toFixed(0)}€ годишно
          </span>
        </>
      ) : (
        <>
          <div className="plan-price-row">
            <span className="plan-price-new">{MONTHLY_PRICE}€</span>
          </div>
          <p className="plan-price-sub">на месец, без обвързване</p>
        </>
      )}

      <div>
        <CheckoutButton
          priceId={isYearly
            ? import.meta.env.VITE_STRIPE_COMPANY_YEARLY_PRICE_ID
            : import.meta.env.VITE_STRIPE_COMPANY_MONTHLY_PRICE_ID}
          label={isYearly ? `Абонирай се — ${YEARLY_TOTAL}€/година` : `Абонирай се — ${MONTHLY_PRICE}€/месец`}
        />
      </div>
    </div>
  )
}