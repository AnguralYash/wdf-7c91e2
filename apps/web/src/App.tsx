import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Gauge,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wind,
} from 'lucide-react'
import { lazy, Suspense, useState } from 'react'

import './dashboard.css'
import { MetricCard } from './components/MetricCard'
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
  const [selectedDate, setSelectedDate] = useState('')
  const overview = useOverview()
  const metadata = useMetadata()
  const activeDate =
    selectedDate || overview.data?.worst_day.decision_date || ''
  const day = useDay(activeDate)

  if (overview.isLoading || metadata.isLoading) {
    return (
      <main className="app-state" aria-busy="true">
        <div className="brand-mark" aria-hidden="true">
          <Wind />
        </div>
        <h1>Preparing the January wind picture</h1>
        <p>Loading validated Elexon forecasts and outturn data…</p>
        <div className="loading-bar" />
      </main>
    )
  }

  if (overview.isError || metadata.isError || !overview.data || !metadata.data) {
    return (
      <main className="app-state">
        <div className="brand-mark brand-mark--error" aria-hidden="true">
          <AlertTriangle />
        </div>
        <h1>The analysis could not be loaded</h1>
        <p>
          Check that the FastAPI service is running, then retry the dashboard.
        </p>
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
  const expectedHours = source.coverage.decision_days * 24
  const coverage = Math.round(
    (source.coverage.hourly_comparisons / expectedHours) * 100,
  )

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Wind Decision home">
          <span className="brand-mark" aria-hidden="true">
            <Wind />
          </span>
          <span>
            <strong>Wind Decision</strong>
            <small>Great Britain · Pilot</small>
          </span>
        </a>
        <div className="system-status">
          <span aria-hidden="true" />
          Elexon snapshot ready
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-section__copy">
            <span className="eyebrow">January 2026 decision intelligence</span>
            <h1>See the wind risk before it becomes a power shortfall.</h1>
            <p>
              Replay the forecast available at the day-ahead cutoff, quantify
              its error, and make procurement decisions with evidence—not a
              single point estimate.
            </p>
            <div className="scope-pills" aria-label="Analysis scope">
              <span>
                <Gauge aria-hidden="true" /> 15:30 GMT cutoff
              </span>
              <span>
                <Activity aria-hidden="true" /> 31 decision days
              </span>
              <span>
                <Database aria-hidden="true" /> 744 hourly comparisons
              </span>
            </div>
          </div>
          <aside className="hero-insight">
            <span className="hero-insight__label">
              <TrendingUp aria-hidden="true" />
              Month-level signal
            </span>
            <strong>{formatMw(period.metrics.bias_mw, true)}</strong>
            <h2>Wind was consistently over-forecast</h2>
            <p>
              A buyer relying on the forecast alone would have faced a
              recurring risk of under-procuring replacement power.
            </p>
          </aside>
        </section>

        <section className="metrics-grid" aria-label="January accuracy summary">
          <MetricCard
            icon={<Gauge />}
            label="Typical miss · MAE"
            value={formatMw(period.metrics.mae_mw)}
            detail="Average absolute difference between forecast and delivered wind."
            tone="warning"
          />
          <MetricCard
            icon={<TrendingUp />}
            label="Forecast bias"
            value={formatMw(period.metrics.bias_mw, true)}
            detail={
              period.metrics.bias_mw > 0
                ? 'Positive bias: wind was usually forecast too high.'
                : 'Negative bias: wind was usually forecast too low.'
            }
            tone={period.metrics.bias_mw > 0 ? 'warning' : 'positive'}
          />
          <MetricCard
            icon={<AlertTriangle />}
            label="Large-miss score · RMSE"
            value={formatMw(period.metrics.rmse_mw)}
            detail="Amplifies the operational importance of unusually large misses."
          />
          <MetricCard
            icon={<ShieldCheck />}
            label="Validated coverage"
            value={`${coverage}%`}
            detail={`${source.coverage.hourly_comparisons} hourly and ${source.coverage.half_hour_actuals.toLocaleString('en-GB')} half-hour records.`}
            tone="positive"
          />
        </section>

        <section className="panel monthly-panel" aria-labelledby="monthly-title">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Month in review</span>
              <h2 id="monthly-title">Where forecast risk concentrated</h2>
              <p>
                Daily bias shows direction; MAE shows the typical size of each
                day’s miss.
              </p>
            </div>
            <div className="extremes">
              <div>
                <small>Most accurate</small>
                <strong>{formatDate(period.best_day.decision_date)}</strong>
                <span>{formatMw(period.best_day.metrics.mae_mw)} MAE</span>
              </div>
              <div className="extremes__risk">
                <small>Highest risk</small>
                <strong>{formatDate(period.worst_day.decision_date)}</strong>
                <span>{formatMw(period.worst_day.metrics.mae_mw)} MAE</span>
              </div>
            </div>
          </div>
          <Suspense
            fallback={<div className="chart-loading">Loading monthly chart…</div>}
          >
            <MonthlyPerformanceChart days={period.days} />
          </Suspense>
        </section>

        {day.isError && (
          <div className="inline-error" role="alert">
            <AlertTriangle aria-hidden="true" />
            The selected decision day could not be loaded. Choose another date
            or retry.
          </div>
        )}

        <Suspense
          fallback={<div className="chart-loading">Loading day detail…</div>}
        >
          <DailyDetail
            days={period.days}
            selectedDate={activeDate}
            onDateChange={setSelectedDate}
            day={day.data}
            isLoading={day.isLoading}
          />
        </Suspense>

        <section className="explain-grid">
          <article className="panel methodology">
            <span className="eyebrow">Trust the analysis</span>
            <h2>Methodology in plain language</h2>
            <ol>
              <li>
                <span>1</span>
                <p>
                  Find every wind forecast published before the 15:30 GMT
                  cutoff on each January decision date.
                </p>
              </li>
              <li>
                <span>2</span>
                <p>
                  Select the newest eligible publication for the following
                  delivery day.
                </p>
              </li>
              <li>
                <span>3</span>
                <p>
                  Average two half-hour actuals into each comparable hourly
                  outcome, then calculate forecast minus actual.
                </p>
              </li>
            </ol>
            <details>
              <summary>View all assumptions</summary>
              <ul>
                {source.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </details>
          </article>

          <article className="panel opportunity">
            <span className="eyebrow">Next opportunity</span>
            <h2>From forecast confidence to purchase guidance</h2>
            <p>
              This pilot quantifies wind uncertainty. A next phase could combine
              it with the utility’s private operational inputs.
            </p>
            <ul>
              <li>
                <CheckCircle2 aria-hidden="true" />
                Consumer demand and other generation forecasts
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                Existing contracts, reserves, and owned assets
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                Market prices and cost-aware purchase scenarios
              </li>
            </ul>
            <div className="formula">
              Residual demand
              <span>= demand − available and contracted supply</span>
            </div>
          </article>
        </section>

        <section className="source-strip">
          <div>
            <Database aria-hidden="true" />
            <span>
              <strong>Official source data</strong>
              Snapshot refreshed{' '}
              {new Date(source.generated_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'UTC',
              })}
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
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Wind />
          </span>
          <span>
            <strong>Wind Decision</strong>
            <small>Evidence for day-ahead procurement</small>
          </span>
        </div>
        <p>Historical pilot · Not an automated trading recommendation</p>
      </footer>
    </div>
  )
}

export default App
