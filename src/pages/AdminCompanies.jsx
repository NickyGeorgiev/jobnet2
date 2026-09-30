import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'

const ACTION_LABELS = { view: 'отворена', download: 'изтеглена', print: 'разпечатана' }
const ADMIN_STATUS_LABELS = { ok: 'Наред', watch: 'Под наблюдение', suspended: 'Блокирана' }

export function AdminCompanies() {
  const [companies, setCompanies] = useState(null)
  const [selected, setSelected] = useState(null)
  const [invoiceEvents, setInvoiceEvents] = useState(null)
  const [search, setSearch] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  async function loadInvoiceEvents(companyId) {
    setInvoiceEvents(null)
    const { data } = await supabase
      .from('invoice_events')
      .select('action, created_at, payments(description, amount, currency)')
      .eq('user_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20)
    setInvoiceEvents(data || [])
  }

  function exportCsv() {
    const rows = companies.map(c => [
      c.company_name || '',
      c.bulstat || '',
      c.mol || '',
      c.contact_email || '',
      c.contact_phone || '',
      c.contact_address || '',
      c.sector || '',
      new Date(c.created_at).toLocaleDateString('bg-BG'),
    ])
    const csv = [['Име на фирма', 'Булстат', 'МОЛ на фирмата', 'Email', 'Телефон', 'Адрес', 'Сектор', 'Регистриран на'], ...rows]
      .map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'firmi.csv'
    link.click()
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false })
      setCompanies(data || [])
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!companies) return null
    const q = search.trim().toLowerCase()
    if (!q) return companies
    return companies.filter((c) =>
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.contact_email || '').toLowerCase().includes(q) ||
      (c.bulstat || '').toLowerCase().includes(q)
    )
  }, [companies, search])

  function openCompany(c) {
    setSelected(c)
    setNoteDraft(c.admin_note || '')
    loadInvoiceEvents(c.id)
  }

  async function handleAdminStatusChange(newStatus) {
    setSelected((s) => ({ ...s, admin_status: newStatus }))
    const { error } = await supabase
      .from('companies')
      .update({ admin_status: newStatus })
      .eq('id', selected.id)
    if (!error) {
      setCompanies((prev) => prev.map((c) => (c.id === selected.id ? { ...c, admin_status: newStatus } : c)))
    }
  }

  async function handleSaveNote() {
    setSavingNote(true)
    const { error } = await supabase
      .from('companies')
      .update({ admin_note: noteDraft })
      .eq('id', selected.id)
    if (!error) {
      setSelected((s) => ({ ...s, admin_note: noteDraft }))
      setCompanies((prev) => prev.map((c) => (c.id === selected.id ? { ...c, admin_note: noteDraft } : c)))
    }
    setSavingNote(false)
  }

  if (companies === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header" style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
        <div><p className="dashboard-eyebrow">Администрация</p><h1 className="dashboard-title">Всички фирми ({filtered.length}{filtered.length !== companies.length ? ` от ${companies.length}` : ''})</h1></div>
        <button className="btn-secondary" onClick={exportCsv}>⬇ Export CSV</button>
      </div>

      <input
        type="text"
        className="admin-search-input"
        placeholder="Търси по име, имейл или ЕИК..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="blog-admin-list">
        {filtered.map((c) => {
          const isInTrial = c.trial_ends_at && new Date(c.trial_ends_at) > new Date()
          const isPaid = c.paid_until && new Date(c.paid_until) > new Date()

          return (
            <div key={c.id} className="blog-admin-row">
              <div>
                <p className="blog-admin-row-title">
                  {isPaid && <span className="blog-status-badge blog-status-badge--published">платено</span>}
                  {!isPaid && isInTrial && <span className="blog-status-badge blog-status-badge--draft">trial</span>}
                  {c.admin_status === 'watch' && <span className="blog-status-badge blog-status-badge--draft">под наблюдение</span>}
                  {c.admin_status === 'suspended' && <span className="blog-status-badge blog-status-badge--rejected">блокирана</span>}
                  {c.company_name || c.email}
                </p>
                <p className="blog-admin-row-meta">{c.contact_email || '—'} · {c.sector || 'без сектор'} · рег. {new Date(c.created_at).toLocaleDateString('bg-BG')}</p>
              </div>
              <button className="btn-secondary" onClick={() => openCompany(c)}>Виж профил</button>
            </div>
          )
        })}
        {filtered.length === 0 && <p style={{ color: 'var(--color-text-muted)', padding: '1rem 0' }}>Няма фирми, отговарящи на търсенето.</p>}
      </div>

      {selected && (
        <div className="cv-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="cv-modal-inner" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="cv-modal-actions">
              <button className="cv-modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="company-details" style={{ marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                {selected.logo_url ? (
                  <img src={selected.logo_url} alt={selected.company_name} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'contain', background: '#fff', padding: '0.3rem' }} />
                ) : (
                  <div className="company-directory-logo-placeholder" style={{ margin: 0 }}>🏢</div>
                )}
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>{selected.company_name}</h3>
              </div>

              <div className="facts-row">
                {selected.sector && <div><span className="fact-value">{selected.sector}</span><span className="fact-label">Сектор</span></div>}
                {selected.founded_year && <div><span className="fact-value">{selected.founded_year}</span><span className="fact-label">Основана</span></div>}
                {selected.employee_count && <div><span className="fact-value">{selected.employee_count}</span><span className="fact-label">Служители</span></div>}
                {selected.locations_count && <div><span className="fact-value">{selected.locations_count}</span><span className="fact-label">Обекти</span></div>}
              </div>

              {selected.bio && <p className="company-bio" style={{ marginTop: '1.5rem' }}>{selected.bio}</p>}

              {(selected.contact_phone || selected.contact_email || selected.contact_address) && (
                <div className="contact-row" style={{ marginTop: '1rem' }}>
                  {selected.contact_phone && <span>📞 {selected.contact_phone}</span>}
                  {selected.contact_email && <span>✉ {selected.contact_email}</span>}
                  {selected.contact_address && <span>📍 {selected.contact_address}</span>}
                </div>
              )}

              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', margin: '0 0 0.6rem' }}>
                  Ръчна проверка
                </p>
                <select
                  className="admin-status-select"
                  value={selected.admin_status || 'ok'}
                  onChange={(e) => handleAdminStatusChange(e.target.value)}
                >
                  {Object.entries(ADMIN_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <textarea
                  className="admin-note-textarea"
                  rows={3}
                  placeholder="Бележка за тази фирма (вижда се само от администратори)..."
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  style={{ marginTop: '0.6rem' }}
                />
                <button className="btn-secondary" onClick={handleSaveNote} disabled={savingNote} style={{ marginTop: '0.5rem' }}>
                  {savingNote ? 'Запазвам...' : 'Запази бележката'}
                </button>
              </div>

              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', margin: '0 0 0.6rem' }}>
                  Активност с фактури
                </p>
                {invoiceEvents === null && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Зареждам...</p>}
                {invoiceEvents?.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Няма отваряни/изтегляни фактури още.</p>}
                {invoiceEvents?.map((e, i) => (
                  <p key={i} style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>
                    {e.action === 'download' && '⬇'} {e.action === 'print' && '🖨'} {e.action === 'view' && '👁'}{' '}
                    <strong>{e.payments?.description || 'Фактура'}</strong>
                    {e.payments?.amount != null && ` — ${Number(e.payments.amount).toFixed(2)} ${e.payments.currency || 'EUR'}`}
                    {' '}({ACTION_LABELS[e.action]}, {new Date(e.created_at).toLocaleString('bg-BG')})
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
