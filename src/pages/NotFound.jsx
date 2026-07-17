import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem'
    }}>
      <p style={{
        fontFamily: 'var(--font-display)', fontSize: '5rem', fontWeight: 700,
        color: 'var(--color-gold)', margin: 0, lineHeight: 1
      }}>404</p>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.6rem' }}>Страницата не е намерена</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.75rem', maxWidth: '400px' }}>
        Адресът, който търсиш, не съществува или е бил преместен.
      </p>
      <Link to="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
        Обратно към началото
      </Link>
    </div>
  )
}