import './LegalPage.css'

export function LegalPage({ title, isPlaceholder, children }) {
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', marginBottom: '1.75rem' }}>{title}</h1>

      {isPlaceholder && (
        <div style={{
          background: 'var(--color-gold-soft)', border: '1px solid var(--color-gold)',
          borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '2rem',
          fontSize: '0.85rem', color: 'var(--color-gold)'
        }}>
          ⚠ Липсват фирмени данни (маркирани в текста) — попълни ги с реалните преди публичен launch.
        </div>
      )}

      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: '2rem',
      }}>
        <div className="legal-content legal-window" style={{
          color: 'var(--color-text-muted)', lineHeight: 1.75, fontSize: '0.95rem'
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}