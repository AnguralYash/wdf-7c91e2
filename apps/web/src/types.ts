export interface AccuracyMetrics {
  sample_count: number
  mae_mw: number
  bias_mw: number
  rmse_mw: number
}

export interface DailySummary {
  decision_date: string
  delivery_date: string
  forecast_published_at: string
  metrics: AccuracyMetrics
}

export interface PeriodSummary {
  decision_date_from: string
  decision_date_to: string
  delivery_date_from: string
  delivery_date_to: string
  metrics: AccuracyMetrics
  best_day: DailySummary
  worst_day: DailySummary
  days: DailySummary[]
}

export interface DataSources {
  forecasts: string
  actuals: string
}

export interface SnapshotMetadata {
  generated_at: string
  timezone: 'GMT'
  decision_cutoff_local: '15:30'
  sources: DataSources
  assumptions: string[]
  coverage: {
    decision_days: number
    hourly_comparisons: number
    half_hour_actuals: number
  }
}

export interface HourlyComparison {
  start_time: string
  forecast_mw: number
  actual_mw: number
  error_mw: number
  absolute_error_mw: number
}

export interface HalfHourlyActual {
  start_time: string
  generation_mw: number
}

export interface DayAnalysis {
  decision_date: string
  delivery_date: string
  decision_cutoff: string
  forecast_published_at: string
  metrics: AccuracyMetrics
  hourly: HourlyComparison[]
  half_hourly_actuals: HalfHourlyActual[]
}
