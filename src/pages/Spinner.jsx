export function Spinner({ label }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '0.75rem', padding: '3rem 1rem'
    }}>
      <div className="spinner-ring" />
      {label && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>{label}</p>}
    </div>
  )
}