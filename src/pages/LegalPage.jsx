export function LegalPage({ title, isPlaceholder, children }) {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)' }}>{title}</h1>

      {isPlaceholder && (
        <div style={{
          background: 'var(--color-gold-soft)', border: '1px solid var(--color-gold)',
          borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '2rem',
          fontSize: '0.85rem', color: 'var(--color-gold)'
        }}>
          ⚠ Примерен текст — трябва да се замени с реален, прегледан от юрист, преди истински launch.
        </div>
      )}

      <div style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
        {children}
      </div>
    </div>
  )
}