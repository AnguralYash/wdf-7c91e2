import { CalendarDays, Clock3, Info, Radio } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  formatCompactMw,
  formatDate,
  formatMw,
  formatTime,
} from '../format'
import type { DailySummary, DayAnalysis } from '../types'

type ChartMode = 'generation' | 'error'

interface DailyDetailProps {
  days: DailySummary[]
  selectedDate: string
  onDateChange: (value: string) => void
  day?: DayAnalysis
  isLoading: boolean
}

function hourKey(value: string): string {
  const date = new Date(value)
  date.setUTCMinutes(0, 0, 0)
  return date.toISOString()
}

export function DailyDetail({
  days,
  selectedDate,
  onDateChange,
  day,
  isLoading,
}: DailyDetailProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('generation')

  const generationData = useMemo(() => {
    if (!day) return []
    const forecastByHour = new Map(
      day.hourly.map((point) => [hourKey(point.start_time), point.forecast_mw]),
    )
    return day.half_hourly_actuals.map((point) => ({
      time: formatTime(point.start_time),
      actual: point.generation_mw,
      forecast: forecastByHour.get(hourKey(point.start_time)),
    }))
  }, [day])

  const errorData = useMemo(
    () =>
      day?.hourly.map((point) => ({
        time: formatTime(point.start_time),
        error: point.error_mw,
      })) ?? [],
    [day],
  )

  return (
    <section className="panel daily-panel" aria-labelledby="daily-title">
      <div className="panel__header daily-panel__header">
        <div>
          <span className="eyebrow">Decision replay</span>
          <h2 id="daily-title">Inspect a purchasing day</h2>
          <p>
            See exactly which forecast was available, then compare it with the
            delivered wind outcome.
          </p>
        </div>
        <label className="date-select">
          <span>Decision date</span>
          <select
            value={selectedDate}
            onChange={(event) => onDateChange(event.target.value)}
          >
            {days.map((summary) => (
              <option
                key={summary.decision_date}
                value={summary.decision_date}
              >
                {formatDate(summary.decision_date)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading || !day ? (
        <div className="chart-loading" role="status">
          Loading decision-day analysis…
        </div>
      ) : (
        <>
          <div className="decision-facts">
            <div>
              <CalendarDays aria-hidden="true" />
              <span>
                <small>Delivery day</small>
                <strong>{formatDate(day.delivery_date)}</strong>
              </span>
            </div>
            <div>
              <Clock3 aria-hidden="true" />
              <span>
                <small>Decision cutoff</small>
                <strong>{formatTime(day.decision_cutoff)} GMT</strong>
              </span>
            </div>
            <div>
              <Radio aria-hidden="true" />
              <span>
                <small>Forecast published</small>
                <strong>{formatTime(day.forecast_published_at)} GMT</strong>
              </span>
            </div>
          </div>

          <div className="daily-metrics">
            <span>
              Typical miss <strong>{formatMw(day.metrics.mae_mw)}</strong>
            </span>
            <span>
              Bias{' '}
              <strong className={day.metrics.bias_mw >= 0 ? 'risk' : ''}>
                {formatMw(day.metrics.bias_mw, true)}
              </strong>
            </span>
            <span>
              Large-miss score{' '}
              <strong>{formatMw(day.metrics.rmse_mw)}</strong>
            </span>
          </div>

          <div className="chart-toolbar">
            <div className="segmented" aria-label="Daily chart view">
              <button
                type="button"
                className={chartMode === 'generation' ? 'is-active' : ''}
                aria-pressed={chartMode === 'generation'}
                onClick={() => setChartMode('generation')}
              >
                Generation
              </button>
              <button
                type="button"
                className={chartMode === 'error' ? 'is-active' : ''}
                aria-pressed={chartMode === 'error'}
                onClick={() => setChartMode('error')}
              >
                Forecast error
              </button>
            </div>
            <p>
              <Info aria-hidden="true" />
              {chartMode === 'generation'
                ? 'Actuals retain their original half-hour detail.'
                : 'Positive values mean wind was over-forecast.'}
            </p>
          </div>

          <div
            className="chart daily-chart"
            role="img"
            aria-label={
              chartMode === 'generation'
                ? 'Forecast and actual wind generation during the delivery day'
                : 'Hourly wind forecast error during the delivery day'
            }
          >
            <ResponsiveContainer width="100%" height={360}>
              {chartMode === 'generation' ? (
                <LineChart
                  data={generationData}
                  margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    interval={7}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompactMw}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatMw(Number(value)),
                      name,
                    ]}
                    labelFormatter={(label) => `${label} GMT`}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--shadow-lg)',
                    }}
                  />
                  <Legend iconType="circle" />
                  <Line
                    dataKey="forecast"
                    name="Hourly forecast"
                    type="stepAfter"
                    stroke="var(--amber-strong)"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    dataKey="actual"
                    name="Half-hour actual"
                    type="monotone"
                    stroke="var(--teal)"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              ) : (
                <BarChart
                  data={errorData}
                  margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    interval={3}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompactMw}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatMw(Number(value), true),
                      'Forecast error',
                    ]}
                    labelFormatter={(label) => `${label} GMT`}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--shadow-lg)',
                    }}
                  />
                  <ReferenceLine y={0} stroke="var(--text-subtle)" />
                  <Bar
                    dataKey="error"
                    name="Forecast error"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  >
                    {errorData.map((point) => (
                      <Cell
                        key={point.time}
                        fill={
                          point.error >= 0
                            ? 'var(--amber-strong)'
                            : 'var(--blue)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  )
}
