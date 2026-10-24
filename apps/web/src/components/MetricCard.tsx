import type { ReactNode } from 'react'

interface MetricCardProps {
  icon: ReactNode
  label: string
  value: string
  detail: string
  tone?: 'neutral' | 'warning' | 'positive'
}

export function MetricCard({
  icon,
  label,
  value,
  detail,
  tone = 'neutral',
}: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__heading">
        <span className="metric-card__icon" aria-hidden="true">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}
