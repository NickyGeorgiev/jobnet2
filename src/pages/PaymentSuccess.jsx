import { Link } from 'react-router-dom'

export function PaymentSuccess() {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>✅ Плащането е успешно!</h2>
      <p>Благодарим ви. Статусът на акаунта ви ще се обнови за няколко секунди.</p>
      <Link to="/">Обратно към началото</Link>
    </div>
  )
}