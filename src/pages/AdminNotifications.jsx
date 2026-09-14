import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'

const TARGET_OPTIONS = [
  { value: 'user', label: 'Конкретни потребители' },
  { value: 'all_candidates', label: 'Всички кандидати' },
  { value: 'all_companies', label: 'Всички фирми' },
  { value: 'all', label: 'Абсолютно всички' },
]

export function AdminNotifications() {
  const { showToast } = useToast()

  const [target, setTarget] = useState('all_candidates')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)

  const [searchType, setSearchType] = useState('candidate')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)

    if (searchType === 'candidate') {
      const { data } = await supabase
        .from('candidates')
        .select('id, fname, lname, contact_email')
        .or(`fname.ilike.%${searchQuery}%,lname.ilike.%${searchQuery}%,contact_email.ilike.%${searchQuery}%`)
        .limit(10)
      setSearchResults((data || []).map((c) => ({ id: c.id, label: `${c.fname || ''} ${c.lname || ''}`.trim() || c.contact_email || c.id })))
    } else {
      const { data } = await supabase
        .from('companies')
        .select('id, company_name, contact_email')
        .or(`company_name.ilike.%${searchQuery}%,contact_email.ilike.%${searchQuery}%`)
        .limit(10)
      setSearchResults((data || []).map((c) => ({ id: c.id, label: c.company_name || c.contact_email || c.id })))
    }

    setSearching(false)
  }

  function toggleSelectedUser(user) {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    )
  }

  function removeSelectedUser(id) {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id))
  }

  async function handleSend() {
    if (!title.trim()) {
      showToast('Заглавието е задължително.', 'error')
      return
    }
    if (target === 'user' && selectedUsers.length === 0) {
      showToast('Избери поне един получател от търсенето по-горе.', 'error')
      return
    }

    const confirmMsg =
      target === 'all'
        ? 'Ще изпратиш известие на АБСОЛЮТНО ВСИЧКИ потребители. Продължи?'
        : target === 'all_candidates'
          ? 'Ще изпратиш известие на ВСИЧКИ кандидати. Продължи?'
          : target === 'all_companies'
            ? 'Ще изпратиш известие на ВСИЧКИ фирми. Продължи?'
            : `Ще изпратиш известие до ${selectedUsers.length} ${selectedUsers.length === 1 ? 'получател' : 'получателя'}. Продължи?`

    if (!confirm(confirmMsg)) return

    setSending(true)

    const { data, error } = await supabase.rpc('admin_send_notification', {
      p_target: target,
      p_title: title.trim(),
      p_body: body.trim() || null,
      p_link: link.trim() || null,
      p_target_user_ids: target === 'user' ? selectedUsers.map((u) => u.id) : null,
    })

    setSending(false)

    if (error) {
      showToast('Грешка: ' + error.message, 'error')
      return
    }

    showToast(`Изпратено до ${data} ${data === 1 ? 'получател' : 'получатели'}.`, 'success')
    setTitle('')
    setBody('')
    setLink('')
    setSelectedUsers([])
    setSearchResults([])
    setSearchQuery('')
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <p className="dashboard-eyebrow">Администрация</p>
        <h1 className="dashboard-title">Известия</h1>
      </div>

      <div className="status-card" style={{ maxWidth: '640px' }}>
        <div className="field">
          <label>Получател</label>
          <select className="input" value={target} onChange={(e) => { setTarget(e.target.value); setSelectedUsers([]) }}>
            {TARGET_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {target === 'user' && (
          <div className="field">
            <label>Търси получатели (може да избереш повече от един)</label>

            {selectedUsers.length > 0 && (
              <div style={{ marginBottom: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                      background: 'var(--color-teal-soft)', color: 'var(--color-teal)',
                      border: '1px solid rgba(79, 184, 174, 0.35)', borderRadius: '999px',
                      padding: '0.25rem 0.7rem', fontSize: '0.82rem',
                    }}
                  >
                    {u.label}
                    <button
                      type="button"
                      onClick={() => removeSelectedUser(u.id)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-teal)', fontWeight: 'bold', padding: 0 }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select className="input" style={{ width: 'auto' }} value={searchType} onChange={(e) => { setSearchType(e.target.value); setSearchResults([]) }}>
                <option value="candidate">Кандидат</option>
                <option value="company">Фирма</option>
              </select>
              <input
                className="input"
                type="text"
                placeholder="Име или имейл..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button type="button" className="btn-secondary" onClick={handleSearch} disabled={searching}>
                {searching ? '...' : 'Търси'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', maxHeight: '180px', overflowY: 'auto' }}>
                {searchResults.map((r) => {
                  const isSelected = selectedUsers.some((u) => u.id === r.id)
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleSelectedUser(r)}
                      style={{
                        padding: '0.6rem 0.85rem', cursor: 'pointer', fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: isSelected ? 'var(--color-teal-soft)' : 'transparent',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                    >
                      <input type="checkbox" checked={isSelected} readOnly style={{ pointerEvents: 'none' }} />
                      {r.label}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="field">
          <label>Заглавие *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="напр. Нова функционалност в Jobstate" />
        </div>

        <div className="field">
          <label>Текст (по избор)</label>
          <textarea className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        <div className="field">
          <label>Линк при клик (по избор)</label>
          <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="напр. /my-cv" />
        </div>

        <button type="button" className="btn-primary" onClick={handleSend} disabled={sending}>
          {sending ? 'Изпращам...' : 'Изпрати известие'}
        </button>
      </div>
    </div>
  )
}
