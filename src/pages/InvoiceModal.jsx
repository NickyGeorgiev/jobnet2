import { useRef, useState } from 'react'

export function InvoiceModal({ payment, userEmail, onClose }) {
  const invoiceRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  function handlePrint() {
    window.print()
  }

  async function handleDownload() {
    setDownloading(true)
    const html2pdf = (await import('html2pdf.js')).default

    await html2pdf()
      .set({
        margin: 10,
        filename: `Фактура-${payment.id.slice(0, 8)}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(invoiceRef.current)
      .save()

    setDownloading(false)
  }

  const date = new Date(payment.created_at).toLocaleDateString('bg-BG')

  return (
    <div className="cv-modal-backdrop" onClick={onClose}>
      <div className="cv-modal-inner" onClick={(e) => e.stopPropagation()}>
        <div className="cv-modal-actions">
          <button className="btn-secondary" onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Генерирам...' : '⬇ Изтегли PDF'}
          </button>
          <button className="btn-secondary" onClick={handlePrint}>🖨 Разпечатай</button>
          <button className="cv-modal-close" onClick={onClose}>✕</button>
        </div>

        <div ref={invoiceRef} className="cv-print-area invoice-print-area">
          <div className="invoice-header">
            <div>
              <p className="invoice-title">Jobstate</p>
              <p style={{ fontSize: '0.8rem', color: '#777', margin: '0.2rem 0 0' }}>jobstate.net</p>
            </div>
            <div className="invoice-meta">
              <p style={{ margin: 0 }}>Фактура №{payment.id.slice(0, 8).toUpperCase()}</p>
              <p style={{ margin: 0 }}>Дата: {date}</p>
            </div>
          </div>

          <p style={{ fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            <strong>Клиент:</strong> {userEmail}
          </p>

          <table className="invoice-table">
            <thead>
              <tr>
                <th>Описание</th>
                <th>Сума</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{payment.description}</td>
                <td>{payment.amount.toFixed(2)} {payment.currency}</td>
              </tr>
            </tbody>
          </table>

          <p className="invoice-total">Общо: {payment.amount.toFixed(2)} {payment.currency}</p>
        </div>
      </div>
    </div>
  )
}