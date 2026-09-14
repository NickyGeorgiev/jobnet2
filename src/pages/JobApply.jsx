import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'
import { Spinner } from './Spinner'

export function JobApply() {
  const { jobId } = useParams()
  const { session, profile, loading: authLoading } = useAuth()
  const { showToast } = useToast()

  const [job, setJob] = useState(null)
  const [loadingJob, setLoadingJob] = useState(true)
  const [alreadyApplied, setAlreadyApplied] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [justApplied, setJustApplied] = useState(false)

  useEffect(() => {
    loadJob()
  }, [jobId])

  useEffect(() => {
    if (session && profile?.role === 'candidate') {
      checkExistingApplication()
    }
  }, [session, profile, jobId])

  async function loadJob() {
    const { data } = await supabase
      .from('job_listings')
      .select('id, title, city, sector, company_id')
      .eq('id', jobId)
      .eq('status', 'published')
      .single()

    if (data) {
      const { data: company } = await supabase
        .from('company_public_names')
        .select('company_name')
        .eq('id', data.company_id)
        .maybeSingle()
      setJob({ ...data, company })
    }

    setLoadingJob(false)
  }

  async function checkExistingApplication() {
    const { data } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_listing_id', jobId)
      .eq('candidate_id', session.user.id)
      .maybeSingle()
    if (data) setAlreadyApplied(true)
  }

  async function handleSubmit() {
    setSubmitting(true)
    const { error } = await supabase.from('job_applications').insert({
      job_listing_id: jobId,
      candidate_id: session.user.id,
      message: message.trim() || null,
      status: 'submitted',
    })
    setSubmitting(false)

    if (error) {
      showToast('Грешка: ' + error.message, 'error')
    } else {
      setJustApplied(true)

      try {
        await supabase.rpc('notify_new_application', { p_job_id: jobId, p_job_title: job.title })
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError)
      }
    }
  }

  if (authLoading || loadingJob) return <Spinner label="Зареждане..." />

  if (!job) {
    return (
      <div className="cv-form-shell">
        <h2 className="cv-form-title">Обявата не е намерена</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Възможно е тя вече да е затворена или премахната.
        </p>
        <Link to="/" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '1rem' }}>
          Начало
        </Link>
      </div>
    )
  }

  // Нелогнат потребител
  if (!session) {
    return (
      <div className="cv-form-shell">
        <h2 className="cv-form-title">{job.title}</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          За да кандидатстваш, трябва да влезеш в профила си или да се регистрираш.
          След това се върни на тази страница, за да кандидатстваш.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to={`/login?redirect=/apply/${jobId}`} className="btn-primary" style={{ textDecoration: 'none' }}>Вход</Link>
          <Link to={`/register?redirect=/apply/${jobId}`} className="btn-secondary" style={{ textDecoration: 'none' }}>Регистрация</Link>
        </div>
      </div>
    )
  }

  // Логнат, но не е кандидат (фирма или admin)
  if (profile?.role !== 'candidate') {
    return (
      <div className="cv-form-shell">
        <h2 className="cv-form-title">{job.title}</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Само кандидати могат да кандидатстват за обяви.
        </p>
      </div>
    )
  }

  // Вече е кандидатствал (преди тази заявка)
  if (alreadyApplied || justApplied) {
    return (
      <div className="cv-form-shell">
        <h2 className="cv-form-title">{job.title}</h2>
        <p style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>
          {justApplied ? 'Кандидатурата ти е изпратена успешно!' : 'Вече си кандидатствал за тази обява.'}
        </p>
        <button className="btn-secondary" disabled>Вече си кандидатствал</button>
      </div>
    )
  }

  // Форма за кандидатстване
  return (
    <div className="cv-form-shell">
      <h2 className="cv-form-title">{job.title}</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
        {job.company?.company_name || 'Фирма'}
        {job.city ? ` · ${job.city}` : ''}
        {job.sector ? ` · ${job.sector}` : ''}
      </p>

      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
        Кандидатурата ти ще включва CV-то от профила ти. По желание можеш да добавиш кратко съобщение към фирмата.
      </p>

      <div className="field">
        <label>Съпроводително съобщение (по желание)</label>
        <textarea
          className="input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Разкажи накратко защо си подходящ за позицията..."
          disabled={submitting}
        />
      </div>

      <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Изпращане...' : 'Кандидатствай'}
      </button>
    </div>
  )
}
