import { useState } from 'react'
import { supabase } from '../supabaseClient'

export function CheckoutButton({ priceId, trialDays, label }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')

    const { data, error: invokeError } = await supabase.functions.invoke(
      'create-checkout-session',
      { body: { priceId, trialDays } }
    )

    if (invokeError) {
      setError('Грешка: ' + invokeError.message)
      setLoading(false)
      return
    }

    // Пренасочваме към Stripe Checkout страницата
    window.location.href = data.url
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading}>
        {loading ? 'Зареждам...' : label}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}