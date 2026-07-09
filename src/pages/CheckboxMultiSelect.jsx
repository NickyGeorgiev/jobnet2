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
      <label>{label}</label>

      {selected.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          {selected.map((s) => (
            <span key={s} style={{
              display: 'inline-block', background: '#e0e0e0', borderRadius: '12px',
              padding: '0.2rem 0.6rem', marginRight: '0.3rem', marginBottom: '0.3rem', fontSize: '0.85rem'
            }}>
              {s}
              <button type="button" onClick={() => toggle(s)}
                style={{ marginLeft: '0.4rem', border: 'none', background: 'none', cursor: 'pointer', color: '#666' }}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        placeholder="Търси..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
      />

      <div style={{
        border: '1px solid #ccc', borderRadius: '4px', maxHeight: '200px',
        overflowY: 'auto', padding: '0.5rem'
      }}>
        {filteredOptions.length === 0 && <p style={{ color: '#888', margin: 0 }}>Няма съвпадения</p>}
        {filteredOptions.map((option) => (
          <label key={option} style={{ display: 'block', padding: '0.2rem 0' }}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggle(option)}
            />
            {' '}{option}
          </label>
        ))}
      </div>
    </div>
  )
}