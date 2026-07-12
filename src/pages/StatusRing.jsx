export function StatusRing({ state, daysLeft }) {
  const size = 86
  const radius = 36
  const circumference = 2 * Math.PI * radius

  let fraction = 0
  let color = 'var(--color-text-muted)'
  let centerContent = ''

  if (state === 'trial' || state === 'gold') {
    fraction = state === 'gold' ? 1 : Math.max(0, Math.min(1, daysLeft / 3))
    color = 'var(--color-gold)'
    centerContent = state === 'gold'
      ? <span className="status-ring-number">★</span>
      : (
        <>
          <span className="status-ring-number">{daysLeft}</span>
          <span className="status-ring-unit">{daysLeft === 1 ? 'ден' : 'дни'}</span>
        </>
      )
  } else if (state === 'active') {
    fraction = 1
    color = 'var(--color-teal)'
    centerContent = <span className="status-ring-number">✓</span>
  } else {
    fraction = 0.06
    color = 'var(--color-danger)'
    centerContent = <span className="status-ring-number">!</span>
  }

  return (
    <div className="status-ring-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface-raised)" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${circumference * fraction} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="status-ring-label">{centerContent}</div>
    </div>
  )
}