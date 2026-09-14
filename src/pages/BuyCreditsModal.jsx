import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { CheckoutButton } from './CheckoutButton'
import stateCreditSvg from '../assets/state-credit.svg'
import './BuyCredits.css'

const BUNDLES = [
  { priceId: 'price_1U6QCxECpirhlp4pnmZINu5a', credits: 250, price: 225, save: 25 },
  { priceId: 'price_1U6QDMECpirhlp4ph6bTaa1S', credits: 500, price: 435, save: 65 },
  { priceId: 'price_1U6QDcECpirhlp4pYZ58yGXy', credits: 1000, price: 840, save: 160 },
  { priceId: 'price_1U6QE1ECpirhlp4pzaidR6pq', credits: 1500, price: 1230, save: 270 },
  { priceId: 'price_1U6QEKECpirhlp4pj3i5aXVo', credits: 2500, price: 1975, save: 525 },
]

export function BuyCreditsModal({ onClose, onBalanceUpdate }) {
  const { session } = useAuth()
  const [balance, setBalance] = useState(null)

  useEffect(() => {
    if (!session) return
    loadBalance()

    const interval = setInterval(loadBalance, 3000)
    return () => clearInterval(interval)
  }, [session])

  async function loadBalance() {
    const { data } = await supabase
      .from('companies')
      .select('token_balance')
      .eq('id', session.user.id)
      .single()
    const newBalance = data?.token_balance ?? 0
    setBalance(newBalance)
    onBalanceUpdate?.(newBalance)
  }

  return (
    <div className="cv-modal-backdrop" onClick={onClose}>
      <div className="cv-modal-inner" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="cv-modal-actions">
          <button className="cv-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="dashboard-shell" style={{ padding: 0 }}>
          <div className="dashboard-header">
            <p className="dashboard-eyebrow">Фирма</p>
            <h1 className="dashboard-title">State Credits</h1>
          </div>

          <div className="status-card" style={{ marginBottom: '2rem' }}>
            <p className="status-title" style={{ marginBottom: '0.2rem' }}>Текущ баланс</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-gold)' }}>
              {balance === null ? '...' : balance}{' '}
              <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>
                <img src={stateCreditSvg} alt="SC" style={{ width: 25, height: 25 }} />
              </span>
            </p>
          </div>

          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
            Купи кредити сега — щом плащането мине, балансът ти ще се обнови автоматично тук, без да губиш попълненото в обявата.
          </p>

          <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
            {BUNDLES.map((b) => {
              const savePercent = Math.round((b.save / b.credits) * 100)
              const isBestValue = b.credits === 2500

              return (
                <div key={b.priceId} className={`credit-bundle-card ${isBestValue ? 'credit-bundle-card--best' : ''}`}>
                  {isBestValue && <span className="credit-bundle-badge">Най-изгодно</span>}

                  <p className="credit-bundle-amount">
                    {b.credits}{' '}
                    <span className="credit-bundle-unit">
                      <img src={stateCreditSvg} alt="SC" style={{ width: 22, height: 22 }} />
                    </span>
                  </p>

                  <div className="credit-bundle-pricing">
                    <span className="credit-bundle-old-price">{b.credits} €</span>
                    <span className="credit-bundle-price">{b.price} €</span>
                  </div>

                  <span className="credit-bundle-save">-{savePercent}% · спестяваш {b.save} €</span>

                  <div style={{ marginTop: '1.25rem' }}>
                    <CheckoutButton priceId={b.priceId} label="Купи" newTab />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
