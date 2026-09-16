import { categoryIcons } from '../data/categoryIcons'

export function SectorIcon({ sector, size = 15, style, ...props }) {
  const Icon = categoryIcons[sector]
  if (!Icon) return null

  return <Icon size={size} style={{ flexShrink: 0, verticalAlign: '-2px', ...style, color: 'var(--color-gold-soft)' }} {...props} />
}
