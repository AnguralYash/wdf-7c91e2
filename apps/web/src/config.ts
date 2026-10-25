export const PILOT_PERIOD = {
  minDecisionDate: '2026-01-01',
  maxDecisionDate: '2026-01-31',
  label: 'January 2026',
} as const

export const API_PATHS = {
  overview: '/api/v1/overview',
  metadata: '/api/v1/metadata',
  day: (decisionDate: string) =>
    `/api/v1/days/${encodeURIComponent(decisionDate)}`,
} as const
