import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'

export function MessageModal({ candidate, onClose }) {
  const { showToast } = useToast()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSend(e) {
    e.preventDefault()
    setSending(true)
    setError('')

    const { data, error: invokeError } = await supabase.functions.invoke('send-message', {
      body: { candidateId: candidate.id, message },
    })

    if (invokeError || data?.error) {
      setError(data?.error || invokeError.message)
      setSending(false)
      return
    }

    showToast('Съобщението е изпратено успешно!', 'success')
    setSending(false)
    onClose()
  }

  const fullName = [candidate.fname, candidate.lname].filter(Boolean).join(' ') || 'кандидата'

  return (
    <div className="cv-modal-backdrop" onClick={onClose}>
      <div className="cv-modal-inner" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="cv-modal-actions">
          <button className="cv-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="company-form-section">
          <h3 className="company-form-section-title">Съобщение до {fullName}</h3>

          <form onSubmit={handleSend}>

            <div className="field">
              <label>Съобщение</label>
              <textarea
                className="input"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Напишете съобщението си тук..."
                required
              />
            </div>

            {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

            <button type="submit" className="btn-primary" disabled={sending} style={{ width: '100%' }}>
              {sending ? 'Изпращам...' : 'Изпрати съобщение'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}