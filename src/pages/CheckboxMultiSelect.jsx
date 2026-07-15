import { useState } from 'react'

export function CheckboxMultiSelect({ options, selected, onChange, label }) {
  const [search, setSearch] = useState('')

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(option) {
    if (selected.includes(option)) {
      onChange(selected.filter((v) => v !== option))
    } else {
      onChange([...selected, option])
    }
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label className="checkbox-group-label">{label}</label>

      {selected.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          {selected.map((s) => (
            <span key={s} style={{
              display: 'inline-block', background: 'var(--color-teal-soft)', color: 'var(--color-teal)',
              border: '1px solid rgba(79, 184, 174, 0.35)', borderRadius: '999px',
              padding: '0.25rem 0.7rem', marginRight: '0.4rem', marginBottom: '0.4rem', fontSize: '0.82rem'
            }}>
              {s}
              <button type="button" onClick={() => toggle(s)}
                style={{ marginLeft: '0.45rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-teal)', fontWeight: 'bold' }}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        className="input"
        placeholder="Търси..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '0.5rem' }}
      />

      <div style={{
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
        background: 'var(--color-surface)', maxHeight: '200px',
        overflowY: 'auto', padding: '0.5rem'
      }}>
        {filteredOptions.length === 0 && <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Няма съвпадения</p>}
        {filteredOptions.map((option) => (
          <label key={option} className="checkbox-item">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggle(option)}
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  )
}