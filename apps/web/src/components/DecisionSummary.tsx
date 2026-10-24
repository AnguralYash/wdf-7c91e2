import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Gauge,
  Radio,
  TrendingUp,
} from 'lucide-react'

import { formatDate, formatMw, formatTime } from '../format'
import type { DayAnalysis } from '../types'
import { MetricCard } from './MetricCard'

interface DecisionSummaryProps {
  day: DayAnalysis
}

export function DecisionSummary({ day }: DecisionSummaryProps) {
  const forecastWasHigh = day.metrics.bias_mw >= 0

  return (
    <section className="summary-section" aria-labelledby="summary-title">
      <div className="summary-section__title">
        <span className="eyebrow">Decision summary</span>
        <h2 id="summary-title">{formatDate(day.decision_date)}</h2>
      </div>

      <section className="decision-context" aria-label="Selected decision">
        <div>
          <CalendarDays aria-hidden="true" />
          <span>
            <small>Delivery date</small>
            <strong>{formatDate(day.delivery_date)}</strong>
          </span>
        </div>
        <div>
          <Clock3 aria-hidden="true" />
          <span>
            <small>Market cutoff</small>
            <strong>{formatTime(day.decision_cutoff)} GMT</strong>
          </span>
        </div>
        <div>
          <Radio aria-hidden="true" />
          <span>
            <small>Forecast used</small>
            <strong>
              {formatTime(day.forecast_published_at)} GMT publication
            </strong>
          </span>
        </div>
      </section>

      <section
        className="metrics-grid metrics-grid--daily"
        aria-label="Selected day accuracy"
      >
        <MetricCard
          icon={<Gauge />}
          label="Average miss"
          value={formatMw(day.metrics.mae_mw)}
          detail="The typical size of the forecast error during this delivery day."
          tone="warning"
        />
        <MetricCard
          icon={<TrendingUp />}
          label="Forecast tendency"
          value={formatMw(day.metrics.bias_mw, true)}
          detail={
            forecastWasHigh
              ? 'Positive: wind was forecast higher than it was delivered.'
              : 'Negative: wind was forecast lower than it was delivered.'
          }
          tone={forecastWasHigh ? 'warning' : 'positive'}
        />
        <MetricCard
          icon={<AlertTriangle />}
          label="Large-error indicator"
          value={formatMw(day.metrics.rmse_mw)}
          detail="A secondary measure that gives greater weight to large misses."
        />
      </section>

      <aside className="plain-insight">
        <strong>What this means</strong>
        <p>
          {forecastWasHigh
            ? `Wind was over-forecast by ${formatMw(day.metrics.bias_mw)} on average, creating a risk of buying too little replacement power.`
            : `Wind was under-forecast by ${formatMw(Math.abs(day.metrics.bias_mw))} on average, creating a risk of buying more replacement power than needed.`}
        </p>
      </aside>
    </section>
  )
}
