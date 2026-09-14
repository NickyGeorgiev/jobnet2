import { useState } from 'react'
import { supabase } from '../supabaseClient'

export function CheckoutButton({ priceId, label, metadata, newTab }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')

    const { data, error: invokeError } = await supabase.functions.invoke(
      'create-checkout-session',
      { body: { priceId, metadata, autoClose: !!newTab } }
    )

    setLoading(false)

    if (invokeError) {
      setError('Грешка: ' + invokeError.message)
      return
    }

    if (newTab) {
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = data.url
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading} className="btn-primary">
        {loading ? 'Зареждам...' : label}
      </button>
      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}