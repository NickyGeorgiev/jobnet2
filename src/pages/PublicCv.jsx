import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { CvPaper } from './CvPaper'
import { useDocumentTitle } from '../useDocumentTitle'
import './CandidateDashboard.css'

export function PublicCv() {
  const { id } = useParams()
  const [cv, setCv] = useState(null)
  const [loading, setLoading] = useState(true)

  useDocumentTitle(cv ? [cv.fname, cv.lname].filter(Boolean).join(' ') : 'CV')

  useEffect(() => {
    async function loadCv() {
      const { data } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', id)
        .eq('active', true)
        .single()
      setCv(data)
      setLoading(false)
    }
    loadCv()
  }, [id])

  if (loading) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  if (!cv) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
        <p>Този профил не е намерен или вече не е активен.</p>
        <Link to="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '1rem' }}>
          Към Jobstate
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <CvPaper cv={cv} />

      <div style={{ textAlign: 'center', marginTop: '2rem', padding: '1.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Това CV е създадено в Jobstate — платформата, където кандидатите казват каква заплата търсят.
        </p>
        <Link to="/register?role=candidate" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Създай своя профил безплатно
        </Link>
      </div>
    </div>
  )
}