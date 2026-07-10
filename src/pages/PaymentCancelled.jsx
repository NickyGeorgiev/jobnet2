import { Link } from 'react-router-dom'

export function PaymentCancelled() {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Плащането беше отменено</h2>
      <p>Не са начислени такси. Можете да опитате отново по всяко време.</p>
      <Link to="/">Обратно към началото</Link>
    </div>
  )
}