import { useQuery } from '@tanstack/react-query'

import { dashboardApi } from '../api'

const FIVE_MINUTES = 5 * 60 * 1_000

export function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: ({ signal }) => dashboardApi.overview(signal),
    staleTime: FIVE_MINUTES,
  })
}

export function useMetadata() {
  return useQuery({
    queryKey: ['metadata'],
    queryFn: ({ signal }) => dashboardApi.metadata(signal),
    staleTime: FIVE_MINUTES,
  })
}

export function useDay(decisionDate: string) {
  return useQuery({
    queryKey: ['day', decisionDate],
    queryFn: ({ signal }) => dashboardApi.day(decisionDate, signal),
    enabled: decisionDate.length > 0,
    staleTime: FIVE_MINUTES,
  })
}
