import { Link, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'

export function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const autoClose = searchParams.get('autoclose') === '1'

  useEffect(() => {
    if (!autoClose) return
    const timer = setTimeout(() => {
      window.close()
    }, 1800)
    return () => clearTimeout(timer)
  }, [autoClose])

  return (
    <div style={{ maxWidth: '440px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.75rem' }}>Плащането е успешно!</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        {autoClose
          ? 'Благодарим ви. Този таб ще се затвори автоматично след няколко секунди — можете и да го затворите ръчно.'
          : 'Благодарим ви. Статусът на акаунта ви ще се обнови за няколко секунди.'}
      </p>
      {!autoClose && (
        <Link to="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Обратно към началото
        </Link>
      )}
    </div>
  )
}