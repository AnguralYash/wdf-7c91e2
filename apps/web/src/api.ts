import type { DayAnalysis, PeriodSummary, SnapshotMetadata } from './types'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const payload = (await response.json()) as { detail?: string }
      message = payload.detail ?? message
    } catch {
      // Keep the status-based fallback when an upstream returns non-JSON.
    }
    throw new ApiError(message, response.status)
  }

  return (await response.json()) as T
}

export const dashboardApi = {
  overview: (signal?: AbortSignal) =>
    getJson<PeriodSummary>('/api/v1/overview', signal),
  metadata: (signal?: AbortSignal) =>
    getJson<SnapshotMetadata>('/api/v1/metadata', signal),
  day: (decisionDate: string, signal?: AbortSignal) =>
    getJson<DayAnalysis>(
      `/api/v1/days/${encodeURIComponent(decisionDate)}`,
      signal,
    ),
}
