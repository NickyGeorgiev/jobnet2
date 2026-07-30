import { useState } from 'react'

export function PasswordInput({ value, onChange, placeholder, required, minLength }) {
  const [show, setShow] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        className="auth-input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        style={{ paddingRight: '2.75rem' }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Скрий паролата' : 'Покажи паролата'}
        style={{
          position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
          fontSize: '1.1rem', padding: '0.2rem',
        }}
      >
        {show ? '🙈' : '👁'}
      </button>
    </div>
  )
}