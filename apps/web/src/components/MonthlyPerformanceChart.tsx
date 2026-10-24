import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatCompactMw, formatMw, formatShortDate } from '../format'
import type { DailySummary } from '../types'

interface MonthlyPerformanceChartProps {
  days: DailySummary[]
}

export function MonthlyPerformanceChart({
  days,
}: MonthlyPerformanceChartProps) {
  const data = days.map((day) => ({
    date: formatShortDate(day.decision_date),
    fullDate: day.decision_date,
    mae: day.metrics.mae_mw,
    bias: day.metrics.bias_mw,
  }))

  return (
    <div
      className="chart"
      role="img"
      aria-label="Daily mean absolute error and forecast bias during January"
    >
      <ResponsiveContainer width="100%" height={330}>
        <ComposedChart
          data={data}
          margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            interval={4}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={formatCompactMw}
            width={48}
          />
          <Tooltip
            formatter={(value, name) => [
              formatMw(Number(value), name === 'Forecast bias'),
              name,
            ]}
            labelFormatter={(label) => `Decision date · ${label}`}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          />
          <Legend iconType="circle" />
          <ReferenceLine y={0} stroke="var(--text-subtle)" />
          <Bar
            dataKey="bias"
            name="Forecast bias"
            fill="var(--amber)"
            radius={[4, 4, 0, 0]}
            maxBarSize={12}
          >
            {data.map((item) => (
              <Cell
                key={item.fullDate}
                fill={item.bias >= 0 ? 'var(--amber)' : 'var(--blue)'}
                fillOpacity={0.45}
              />
            ))}
          </Bar>
          <Line
            dataKey="mae"
            name="Typical miss (MAE)"
            type="monotone"
            stroke="var(--teal)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
