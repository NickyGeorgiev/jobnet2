import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { CheckoutButton } from './CheckoutButton'

export function CandidateDashboard() {
  const { session } = useAuth()
  const [isGold, setIsGold] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStatus() {
      const { data } = await supabase
        .from('candidates')
        .select('is_gold')
        .eq('id', session.user.id)
        .single()
      setIsGold(data?.is_gold || false)
      setLoading(false)
    }
    loadStatus()
  }, [session])

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Добре дошъл, {session?.user?.email}</h2>
      <p>Това е твоят панел като кандидат.</p>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
        <Link to="/my-cv" style={{
          padding: '1rem 1.5rem', border: '1px solid #ccc', borderRadius: '8px',
          textDecoration: 'none', color: 'inherit'
        }}>
          📄 Моето CV
        </Link>
      </div>

      {!loading && (
        <div style={{ border: '1px solid gold', padding: '1.5rem', borderRadius: '8px', maxWidth: '400px' }}>
          {isGold ? (
            <>
              <h3>⭐ Имаш Gold статус</h3>
              <p>CV-то ти излиза най-отгоре в резултатите на фирмите.</p>
            </>
          ) : (
            <>
              <h3>Стани Gold кандидат</h3>
              <p>10€/месец — CV-то ти излиза първо в резултатите на всяка фирма.</p>
              <CheckoutButton
                priceId={import.meta.env.VITE_STRIPE_GOLD_PRICE_ID}
                label="Стани Gold — 10€/мес"
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}