import {
  AlertTriangle,
  Database,
  RefreshCw,
  Wind,
} from 'lucide-react'
import { lazy, Suspense, useState } from 'react'

import './dashboard.css'
import { DateSelector } from './components/DateSelector'
import { DecisionSummary } from './components/DecisionSummary'
import { SupportingDetails } from './components/SupportingDetails'
import { formatDate, formatMw } from './format'
import { useDay, useMetadata, useOverview } from './hooks/useDashboard'

const DailyDetail = lazy(() =>
  import('./components/DailyDetail').then((module) => ({
    default: module.DailyDetail,
  })),
)

const MonthlyPerformanceChart = lazy(() =>
  import('./components/MonthlyPerformanceChart').then((module) => ({
    default: module.MonthlyPerformanceChart,
  })),
)

function App() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const overview = useOverview()
  const metadata = useMetadata()
  const activeDate =
    selectedDate === null
      ? overview.data?.worst_day.decision_date || ''
      : selectedDate
  const day = useDay(activeDate)

  if (overview.isLoading || metadata.isLoading) {
    return (
      <main className="app-state" aria-busy="true">
        <span className="brand-mark" aria-hidden="true">
          <Wind />
        </span>
        <h1>Loading wind forecast analysis</h1>
        <p>Preparing validated Elexon data...</p>
        <div className="loading-bar" />
      </main>
    )
  }

  if (overview.isError || metadata.isError || !overview.data || !metadata.data) {
    return (
      <main className="app-state">
        <span className="brand-mark brand-mark--error" aria-hidden="true">
          <AlertTriangle />
        </span>
        <h1>The analysis could not be loaded</h1>
        <p>Check that the FastAPI service is running, then try again.</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          <RefreshCw aria-hidden="true" />
          Retry
        </button>
      </main>
    )
  }

  const period = overview.data
  const source = metadata.data

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Wind Decision home">
          <span className="brand-mark" aria-hidden="true">
            <Wind />
          </span>
          <span>
            <strong>Wind Decision</strong>
            <small>Great Britain, January 2026 pilot</small>
          </span>
        </a>
        <span className="data-status">
          <span aria-hidden="true" />
          Elexon data ready
        </span>
      </header>

      <main id="top">
        <section className="page-heading">
          <div>
            <span className="eyebrow">Day-ahead wind decisions</span>
            <h1>Wind forecast accuracy</h1>
            <p>
              Choose a purchasing date to see the forecast available before the
              market cutoff and what happened on the following delivery day.
            </p>
          </div>
          <DateSelector
            value={activeDate}
            isDefault={selectedDate === null}
            onChange={setSelectedDate}
          />
        </section>

        {day.isError && (
          <div className="inline-error" role="alert">
            <AlertTriangle aria-hidden="true" />
            <span>The selected day could not be loaded.</span>
            <button type="button" onClick={() => day.refetch()}>
              Retry
            </button>
          </div>
        )}

        {!activeDate ? (
          <div className="content-loading" role="status">
            Select a January decision date to view its analysis.
          </div>
        ) : day.isError ? null : day.data ? (
          <DecisionSummary day={day.data} />
        ) : (
          <div className="content-loading" role="status">
            Loading the selected day...
          </div>
        )}

        {activeDate && !day.isError && (
          <Suspense
            fallback={<div className="content-loading">Loading chart...</div>}
          >
            <DailyDetail day={day.data} isLoading={day.isLoading} />
          </Suspense>
        )}

        <section className="panel monthly-panel" aria-labelledby="monthly-title">
          <div className="panel__header">
            <div>
              <span className="eyebrow">January context</span>
              <h2 id="monthly-title">How accuracy changed through the month</h2>
              <p>
                Compare the selected day with the complete January decision
                period.
              </p>
            </div>
            <div className="month-highlights">
              <span>
                Best: <strong>{formatDate(period.best_day.decision_date)}</strong>
              </span>
              <span>
                Highest error:{' '}
                <strong>{formatDate(period.worst_day.decision_date)}</strong>
              </span>
              <span>
                Monthly average miss:{' '}
                <strong>{formatMw(period.metrics.mae_mw)}</strong>
              </span>
            </div>
          </div>
          <Suspense
            fallback={<div className="content-loading">Loading chart...</div>}
          >
            <MonthlyPerformanceChart days={period.days} />
          </Suspense>
        </section>

        <SupportingDetails assumptions={source.assumptions} />

        <section className="source-strip">
          <div>
            <Database aria-hidden="true" />
            <span>
              <strong>Coverage</strong>
              {source.coverage.decision_days} days,{' '}
              {source.coverage.hourly_comparisons} hourly comparisons
            </span>
          </div>
          <nav aria-label="Elexon data sources">
            <a href={source.sources.forecasts} target="_blank" rel="noreferrer">
              WINDFOR forecasts
            </a>
            <a href={source.sources.actuals} target="_blank" rel="noreferrer">
              FUELHH actuals
            </a>
          </nav>
        </section>
      </main>

      <footer>
        <span>Historical pilot. Not an automated trading recommendation.</span>
      </footer>
    </div>
  )
}

export default App
