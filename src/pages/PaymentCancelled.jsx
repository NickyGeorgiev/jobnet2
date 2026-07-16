import { Link } from 'react-router-dom'

export function PaymentCancelled() {
  return (
    <div style={{ maxWidth: '440px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠</div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.75rem' }}>Плащането беше отменено</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Не са начислени такси. Можете да опитате отново по всяко време.
      </p>
      <Link to="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
        Обратно към началото
      </Link>
    </div>
  )
}