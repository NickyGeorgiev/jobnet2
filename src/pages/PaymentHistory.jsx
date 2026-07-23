import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { InvoiceModal } from './InvoiceModal'
import './PaymentHistory.css'

export function PaymentHistory() {
  const { session } = useAuth()
  const [payments, setPayments] = useState(null)
  const [selectedPayment, setSelectedPayment] = useState(null)

  useEffect(() => {
    async function loadPayments() {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      setPayments(data || [])
    }
    loadPayments()
  }, [session])

  if (payments === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="payment-history-shell">
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem' }}>История на плащанията</h2>

      {payments.length === 0 && (
        <div className="payment-empty">Все още нямаш направени плащания.</div>
      )}

      {payments.map((p) => (
        <div key={p.id} className="payment-row">
          <div>
            <p className="payment-row-date">{new Date(p.created_at).toLocaleDateString('bg-BG')}</p>
            <p className="payment-row-desc">{p.description}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="payment-row-amount">{p.amount.toFixed(2)} {p.currency}</span>
            <button className="btn-secondary" onClick={() => setSelectedPayment(p)}>Фактура</button>
          </div>
        </div>
      ))}

      {selectedPayment && (
        <InvoiceModal
          payment={selectedPayment}
          userEmail={session.user.email}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </div>
  )
}