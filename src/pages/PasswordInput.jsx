import { useState } from 'react'

const EyeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a17.5 17.5 0 0 1-3.2 4.4" />
    <path d="M6.2 6.2C3.5 8.2 2 12 2 12s3.5 8 10 8c1.5 0 2.8-.3 4-.8" />
  </svg>
)

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
        {show ? <EyeOffIcon/> : <EyeIcon/>}
      </button>
    </div>
  )
}