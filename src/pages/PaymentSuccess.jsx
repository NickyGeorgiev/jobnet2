import { Link } from 'react-router-dom'

export function PaymentSuccess() {
  return (
    <div style={{ maxWidth: '440px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.75rem' }}>Плащането е успешно!</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Благодарим ви. Статусът на акаунта ви ще се обнови за няколко секунди.
      </p>
      <Link to="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
        Обратно към началото
      </Link>
    </div>
  )
}