import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DailyDetail } from './DailyDetail'
import type { DayAnalysis } from '../types'

vi.mock('recharts', () => {
  const Container = ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  )
  const Empty = () => null
  return {
    ResponsiveContainer: Container,
    LineChart: Container,
    BarChart: Container,
    Bar: Container,
    Line: Empty,
    Cell: Empty,
    CartesianGrid: Empty,
    Legend: Empty,
    ReferenceLine: Empty,
    Tooltip: Empty,
    XAxis: Empty,
    YAxis: Empty,
  }
})

const metrics = {
  sample_count: 1,
  mae_mw: 100,
  bias_mw: 100,
  rmse_mw: 100,
}

const day: DayAnalysis = {
  decision_date: '2026-01-10',
  delivery_date: '2026-01-11',
  forecast_published_at: '2026-01-10T11:30:00Z',
  metrics,
  decision_cutoff: '2026-01-10T15:30:00Z',
  hourly: [
    {
      start_time: '2026-01-11T00:00:00Z',
      forecast_mw: 1_100,
      actual_mw: 1_000,
      error_mw: 100,
      absolute_error_mw: 100,
    },
  ],
  half_hourly_actuals: [
    {
      start_time: '2026-01-11T00:00:00Z',
      generation_mw: 1_000,
    },
  ],
}

describe('DailyDetail', () => {
  it('switches to the error explanation', async () => {
    const user = userEvent.setup()
    render(<DailyDetail day={day} isLoading={false} />)

    await user.click(
      screen.getByRole('button', { name: /forecast error/i }),
    )
    expect(
      screen.getByText(/positive error means wind was forecast too high/i),
    ).toBeInTheDocument()
  })
})
