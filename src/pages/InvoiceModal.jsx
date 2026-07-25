import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const VAT_RATE = 0

export function InvoiceModal({ payment, userEmail, onClose }) {
  const invoiceRef = useRef(null)
  const [downloading, setDownloading] = useState(false)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCompany() {
      if (payment.user_type === 'company') {
        const { data } = await supabase
          .from('companies')
          .select('company_name, bulstat, mol, contact_address')
          .eq('id', payment.user_id)
          .single()
        setCompany(data)
      }
      setLoading(false)
    }
    loadCompany()
  }, [payment])

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
  const invoiceNumber = payment.id.replace(/-/g, '').slice(0, 10).toUpperCase()

  const total = Number(payment.amount)
  const vatAmount = total * VAT_RATE / (1 + VAT_RATE)
  const subtotal = total - vatAmount

  // За фактури на фирми, изискваме пълни данни, преди да генерираме документа
  const isCompanyInvoice = payment.user_type === 'company'
  const missingCompanyData = isCompanyInvoice && company &&
    (!company.company_name || !company.bulstat || !company.mol || !company.contact_address)

  if (loading) {
    return (
      <div className="cv-modal-backdrop" onClick={onClose}>
        <div className="cv-modal-inner" onClick={(e) => e.stopPropagation()}>
          <div className="cv-modal-actions">
            <button className="cv-modal-close" onClick={onClose}>✕</button>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Зареждам данните...</p>
        </div>
      </div>
    )
  }

  if (missingCompanyData) {
    return (
      <div className="cv-modal-backdrop" onClick={onClose}>
        <div className="cv-modal-inner" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
          <div className="cv-modal-actions">
            <button className="cv-modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="status-card" style={{ borderColor: 'var(--color-gold)' }}>
            <h3 className="status-title" style={{ marginBottom: '0.5rem' }}>Липсват фирмени данни</h3>
            <p className="status-sub" style={{ marginBottom: '1.25rem' }}>
              За да генерираме коректна фактура, трябва да попълните име на фирмата, булстат, МОЛ и адрес в профила на фирмата.
            </p>
            <Link to="/company-profile" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }} onClick={onClose}>
              Попълни профила на фирмата
            </Link>
          </div>
        </div>
      </div>
    )
  }

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
              <p style={{ fontSize: '0.8rem', color: '#777', margin: '0.2rem 0 0' }}>
                Наименование: [попълни]<br />
                ЕИК: [попълни]<br />
                Адрес: [попълни]<br />
                jobstate.net · info@jobstate.net
              </p>
            </div>
            <div className="invoice-meta">
              <p style={{ margin: 0, fontWeight: 600 }}>Фактура №{invoiceNumber}</p>
              <p style={{ margin: '0.2rem 0 0' }}>Дата на издаване: {date}</p>
              <p style={{ margin: 0 }}>Данъчно събитие: {date}</p>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.78rem', color: '#888', margin: '0 0 0.2rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Получател</p>
            {isCompanyInvoice && company ? (
              <p style={{ fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
                <strong>{company.company_name}</strong><br />
                ЕИК: {company.bulstat}<br />
                МОЛ: {company.mol}<br />
                Адрес: {company.contact_address}<br />
                {userEmail}
              </p>
            ) : (
              <p style={{ fontSize: '0.9rem', margin: 0 }}><strong>{userEmail}</strong></p>
            )}
          </div>

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
                <td>{subtotal.toFixed(2)} {payment.currency}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', marginBottom: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>
              Данъчна основа: {subtotal.toFixed(2)} {payment.currency}
            </p>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>
              ДДС ({(VAT_RATE * 100).toFixed(0)}%): {vatAmount.toFixed(2)} {payment.currency}
            </p>
            <p className="invoice-total">Сума за плащане: {total.toFixed(2)} {payment.currency}</p>
          </div>

          {VAT_RATE === 0 && (
            <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '1.5rem' }}>
              Доставчикът не е регистриран по ЗДДС.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}