import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { CvPaper } from './CvPaper'

// Отделна, "гола" страница — само CV-то, нищо друго около него в
// нормалния поток на приложението (без модал, без fixed родители).
// Точно затова печатът/PDF генерирането оттук не страда от
// multi-page дублирането, което имахме в CvModal.
export function CvPrintPage() {
  const { id } = useParams()
  const [cv, setCv] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCv() {
      const { data } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', id)
        .single()
      setCv(data)
      setLoading(false)
    }
    loadCv()
  }, [id])

  useEffect(() => {
    if (!loading && cv) {
      // Малко закъснение, за да са сигурни, че шрифтовете/снимката
      // на кандидата са се заредили преди диалога за печат да се
      // отвори.
      const timer = setTimeout(() => window.print(), 300)
      return () => clearTimeout(timer)
    }
  }, [loading, cv])

  if (loading) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  if (!cv) {
    return <div style={{ padding: '2rem' }}>CV-то не е намерено или нямаш достъп до него.</div>
  }

  return (
    <div className="cv-print-page">
      <CvPaper cv={cv} watermark={true} />
    </div>
  )
}
