const mwFormatter = new Intl.NumberFormat('en-GB', {
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const shortDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
})

export function formatMw(value: number, signed = false): string {
  const sign = signed && value > 0 ? '+' : ''
  return `${sign}${mwFormatter.format(value)} MW`
}

export function formatCompactMw(value: number): string {
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`
  }
  return mwFormatter.format(value)
}

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`))
}

export function formatShortDate(value: string): string {
  return shortDateFormatter.format(new Date(`${value}T00:00:00Z`))
}

export function formatTime(value: string): string {
  return timeFormatter.format(new Date(value))
}
