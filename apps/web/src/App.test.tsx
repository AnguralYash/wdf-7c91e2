import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'

vi.mock('./components/MonthlyPerformanceChart', () => ({
  MonthlyPerformanceChart: () => <div>Monthly performance chart</div>,
}))

vi.mock('./components/DailyDetail', () => ({
  DailyDetail: ({ selectedDate }: { selectedDate: string }) => (
    <div>Daily detail for {selectedDate}</div>
  ),
}))

const metrics = {
  sample_count: 24,
  mae_mw: 1_000,
  bias_mw: 200,
  rmse_mw: 1_200,
}

const summary = {
  decision_date: '2026-01-10',
  delivery_date: '2026-01-11',
  forecast_published_at: '2026-01-10T11:30:00Z',
  metrics,
}

const overview = {
  decision_date_from: '2026-01-01',
  decision_date_to: '2026-01-31',
  delivery_date_from: '2026-01-02',
  delivery_date_to: '2026-02-01',
  metrics: { ...metrics, sample_count: 744 },
  best_day: summary,
  worst_day: summary,
  days: [summary],
}

const metadata = {
  generated_at: '2026-10-24T12:00:00Z',
  timezone: 'GMT',
  decision_cutoff_local: '15:30',
  sources: {
    forecasts: 'https://example.test/WINDFOR',
    actuals: 'https://example.test/FUELHH',
  },
  assumptions: ['A documented test assumption.'],
  coverage: {
    decision_days: 31,
    hourly_comparisons: 744,
    half_hour_actuals: 1_488,
  },
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('loads overview data and opens the highest-risk decision day', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const path = String(input)
      const payload = path.includes('/metadata')
        ? metadata
        : path.includes('/days/')
          ? {
              ...summary,
              decision_cutoff: '2026-01-10T15:30:00Z',
              hourly: [],
              half_hourly_actuals: [],
            }
          : overview
      return Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    expect(
      await screen.findByRole('heading', {
        name: /see the wind risk before it becomes a power shortfall/i,
      }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Daily detail for 2026-01-10'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Monthly performance chart'),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/days/2026-01-10',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('shows a recoverable error when the API is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response('unavailable', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          }),
        ),
      ),
    )

    renderApp()

    expect(
      await screen.findByRole('heading', {
        name: /analysis could not be loaded/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
