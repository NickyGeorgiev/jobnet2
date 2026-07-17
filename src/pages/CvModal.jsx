import { useRef, useState } from 'react'
import { CvPaper } from './CvPaper'

export function CvModal({ cv, onClose, showDownload }) {
  const paperRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  function handlePrint() {
    window.print()
  }

  async function handleDownload() {
    setDownloading(true)
    const html2pdf = (await import('html2pdf.js')).default
    const fullName = [cv.fname, cv.lname].filter(Boolean).join(' ') || 'CV'

    await html2pdf()
      .set({
        margin: 0,
        filename: `${fullName}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(paperRef.current)
      .save()

    setDownloading(false)
  }

  return (
    <div className="cv-modal-backdrop" onClick={onClose}>
      <div className="cv-modal-inner" onClick={(e) => e.stopPropagation()}>
        <div className="cv-modal-actions">
          {showDownload && (
            <button className="btn-secondary" onClick={handleDownload} disabled={downloading}>
              {downloading ? 'Генерирам...' : '⬇ Изтегли PDF'}
            </button>
          )}
          <button className="btn-secondary" onClick={handlePrint}>🖨 Разпечатай</button>
          <button className="cv-modal-close" onClick={onClose}>✕</button>
        </div>
        <div ref={paperRef} className="cv-print-area">
          <div className="cv-paper-scale-wrap">
            <CvPaper cv={cv} />
          </div>
        </div>
      </div>
    </div>
  )
}