import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { CheckoutButton } from './CheckoutButton'

export function CompanyDashboard() {
  const { session } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStatus() {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', session.user.id)
        .maybeSingle()
      setSubscription(data)
      setLoading(false)
    }
    loadStatus()
  }, [session])

  const hasActiveSubscription = subscription && ['active', 'trialing'].includes(subscription.status)

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Добре дошли, {session?.user?.email}</h2>
      <p>Това е вашият панел като фирма.</p>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
        <Link to="/company-profile" style={{
          padding: '1rem 1.5rem', border: '1px solid #ccc', borderRadius: '8px',
          textDecoration: 'none', color: 'inherit'
        }}>
          🏢 Профил на фирмата
        </Link>
        <Link to="/search" style={{
          padding: '1rem 1.5rem', border: '1px solid #ccc', borderRadius: '8px',
          textDecoration: 'none', color: 'inherit'
        }}>
          🔍 Търсене на кандидати
        </Link>
      </div>

      {!loading && (
        <div style={{ border: '1px solid #ccc', padding: '1.5rem', borderRadius: '8px', maxWidth: '400px' }}>
          {hasActiveSubscription ? (
            <>
              <h3>✅ Абонаментът е активен</h3>
              <p>Статус: {subscription.status === 'trialing' ? 'Пробен период' : 'Активен'}</p>
              {subscription.current_period_end && (
                <p>Подновява се на: {new Date(subscription.current_period_end).toLocaleDateString('bg-BG')}</p>
              )}
            </>
          ) : (
            <>
              <h3>Абонирайте се</h3>
              <p>30€/месец за неограничен достъп до търсене на кандидати.</p>
              <p style={{ color: 'green' }}>Първите 14 дни са безплатни!</p>
              <CheckoutButton
                priceId={import.meta.env.VITE_STRIPE_COMPANY_PRICE_ID}
                trialDays={14}
                label="Започни 14-дневен безплатен период"
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}