import { Info } from 'lucide-react'
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

import { formatCompactMw, formatMw, formatTime } from '../format'
import type { DayAnalysis } from '../types'

type ChartMode = 'generation' | 'error'

interface DailyDetailProps {
  day?: DayAnalysis
  isLoading: boolean
}

interface TooltipEntry {
  name?: string
  value?: number | string
  color?: string
}

interface GenerationTooltipProps {
  active?: boolean
  label?: string
  payload?: readonly TooltipEntry[]
}

function hourKey(value: string): string {
  const date = new Date(value)
  date.setUTCMinutes(0, 0, 0)
  return date.toISOString()
}

function GenerationTooltip({
  active,
  label,
  payload,
}: GenerationTooltipProps) {
  if (!active || !payload?.length) return null

  const actual = Number(payload.find((entry) => entry.name === 'Actual')?.value)
  const forecast = Number(
    payload.find((entry) => entry.name === 'Forecast')?.value,
  )
  if (!Number.isFinite(actual) || !Number.isFinite(forecast)) return null

  return (
    <div className="chart-tooltip">
      <strong>{label} GMT</strong>
      <span>
        Actual <b>{formatMw(actual)}</b>
      </span>
      <span>
        Forecast <b>{formatMw(forecast)}</b>
      </span>
      <span className="chart-tooltip__gap">
        Gap <b>{formatMw(forecast - actual, true)}</b>
      </span>
      <small>Forecast - half-hour actual</small>
    </div>
  )
}

export function DailyDetail({ day, isLoading }: DailyDetailProps) {
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
      <div className="panel__header chart-header">
        <div>
          <span className="eyebrow">Selected day</span>
          <h2 id="daily-title">Forecast compared with actual generation</h2>
          <p>
            The forecast is hourly. Actual generation retains its original
            half-hour detail.
          </p>
        </div>
        <div
          className="segmented"
          role="group"
          aria-label="Daily chart view"
        >
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
      </div>

      {isLoading || !day ? (
        <div className="content-loading" role="status">
          Loading the selected day...
        </div>
      ) : (
        <>
          <p className="chart-note">
            <Info aria-hidden="true" />
            {chartMode === 'generation'
              ? 'Compare the forecast line with the delivered wind line.'
              : 'Positive error means wind was forecast too high.'}
          </p>
          <div
            className="chart daily-chart"
            role="img"
            aria-label={
              chartMode === 'generation'
                ? 'Forecast and actual wind generation during the delivery day'
                : 'Hourly wind forecast error during the delivery day'
            }
          >
            <ResponsiveContainer width="100%" height={350}>
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
                  <Tooltip content={<GenerationTooltip />} />
                  <Legend iconType="circle" />
                  <Line
                    dataKey="forecast"
                    name="Forecast"
                    type="stepAfter"
                    stroke="var(--amber-strong)"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    dataKey="actual"
                    name="Actual"
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
