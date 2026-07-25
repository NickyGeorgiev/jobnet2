import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'

export function ContactUs() {
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSending(true)
    setError('')

    const { data, error: invokeError } = await supabase.functions.invoke('send-contact-message', {
      body: { name, email, message },
    })

    if (invokeError || data?.error) {
      setError(data?.error || invokeError.message)
      setSending(false)
      return
    }

    showToast('Съобщението е изпратено! Ще се свържем с вас скоро.', 'success')
    setName('')
    setEmail('')
    setMessage('')
    setSending(false)
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', marginBottom: '0.5rem' }}>Контакти</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Имате въпрос или проблем? Пишете ни — отговаряме възможно най-бързо.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }} className="contact-grid">
        <div className="company-form-section" style={{ margin: 0 }}>
          <h3 className="company-form-section-title">Изпрати съобщение</h3>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Име</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="field">
              <label>Имейл</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="field">
              <label>Съобщение</label>
              <textarea className="input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required />
            </div>

            {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

            <button type="submit" className="btn-primary" disabled={sending} style={{ width: '100%' }}>
              {sending ? 'Изпращам...' : 'Изпрати'}
            </button>
          </form>
        </div>

        <div>
          <div className="status-card" style={{ marginBottom: '1rem' }}>
            <p className="status-title" style={{ marginBottom: '0.3rem' }}>✉ Имейл</p>
            <p className="status-sub">info@jobstate.net</p>
          </div>
          <div className="status-card">
            <p className="status-title" style={{ marginBottom: '0.3rem' }}>🕐 Работно време</p>
            <p className="status-sub">Понеделник – Петък, 09:00 – 18:00</p>
          </div>
        </div>
      </div>
    </div>
  )
}