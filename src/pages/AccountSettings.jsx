import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { useDocumentTitle } from '../useDocumentTitle'
import { useToast } from './Toast'

export function AccountSettings() {
  useDocumentTitle('Настройки на акаунта')
  const { session } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (confirmText !== 'ИЗТРИЙ') {
      setError('Моля, напишете точно ИЗТРИЙ, за да потвърдите.')
      return
    }

    if (!confirm('Това действие е необратимо. Наистина ли искате да изтриете акаунта си завинаги?')) {
      return
    }

    setDeleting(true)
    setError('')

    const { data, error: invokeError } = await supabase.functions.invoke('delete-account')

    if (invokeError || data?.error) {
      setError(data?.error || invokeError.message)
      setDeleting(false)
      return
    }

    showToast('Акаунтът е изтрит успешно.', 'success')
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem' }}>Настройки на акаунта</h2>

      <div className="status-card" style={{ marginBottom: '1.5rem' }}>
        <p className="status-title" style={{ marginBottom: '0.3rem' }}>Имейл</p>
        <p className="status-sub">{session?.user?.email}</p>
      </div>

      <div className="status-card" style={{ borderColor: 'var(--color-danger)' }}>
        <p className="status-title" style={{ marginBottom: '0.4rem', color: 'var(--color-danger)' }}>Изтриване на акаунта</p>
        <p className="status-sub" style={{ marginBottom: '1.25rem' }}>
          Това ще изтрие завинаги вашия профил, CV/фирмени данни, история на плащанията и всички свързани записи.
          Действието е необратимо.
        </p>

        <div className="field">
          <label>Напишете <strong style={{ color: 'var(--color-text)' }}>ИЗТРИЙ</strong>, за да потвърдите</label>
          <input
            className="input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ИЗТРИЙ"
          />
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

        <button
          onClick={handleDelete}
          disabled={deleting || confirmText !== 'ИЗТРИЙ'}
          className="btn-primary"
          style={{ background: 'var(--color-danger)', color: '#fff' }}
        >
          {deleting ? 'Изтривам...' : 'Изтрий акаунта завинаги'}
        </button>
      </div>
    </div>
  )
}