/** Helpers for compact monthly series: consecutive months from a start key with `null` gaps. */
export type MonthKey = { year: number; month: number }
export type MonthlyPoint = MonthKey & { value: number }
export type SeriesLike = { start: string; values: readonly (number | null)[] }

export function parseMonthKey(key: string): MonthKey {
  const match = /^(\d{4})-(\d{2})/.exec(key)
  if (!match) throw new Error(`Invalid month key: ${key}`)
  return { year: Number(match[1]), month: Number(match[2]) }
}

export function formatMonthKey({ year, month }: MonthKey) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function compareMonths(a: MonthKey, b: MonthKey) {
  return a.year - b.year || a.month - b.month
}

export function nextMonth({ year, month }: MonthKey): MonthKey {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

/** Average of the months published in a calendar year, with the number of months it covers. */
export function yearAverage(series: SeriesLike, year: number): { value: number; months: number; through: MonthKey } | null {
  let sum = 0, months = 0, through: MonthKey | null = null
  for (let month = 1; month <= 12; month += 1) {
    const value = valueAt(series, { year, month })
    if (value === null) continue
    sum += value; months += 1; through = { year, month }
  }
  return through ? { value: sum / months, months, through } : null
}

export function monthOffset(series: SeriesLike, key: MonthKey) {
  const start = parseMonthKey(series.start)
  return (key.year - start.year) * 12 + (key.month - start.month)
}

export function monthAt(series: SeriesLike, index: number): MonthKey {
  const start = parseMonthKey(series.start)
  const total = start.month - 1 + index
  return { year: start.year + Math.floor(total / 12), month: (total % 12) + 1 }
}

export function valueAt(series: SeriesLike, key: MonthKey): number | null {
  const index = monthOffset(series, key)
  if (index < 0 || index >= series.values.length) return null
  return series.values[index] ?? null
}

export function firstAvailable(series: SeriesLike): MonthlyPoint | null {
  const index = series.values.findIndex((value) => value !== null)
  return index < 0 ? null : { ...monthAt(series, index), value: series.values[index] as number }
}

export function lastAvailable(series: SeriesLike): MonthlyPoint | null {
  for (let index = series.values.length - 1; index >= 0; index -= 1) {
    const value = series.values[index]
    if (value !== null) return { ...monthAt(series, index), value }
  }
  return null
}

/** The latest published month of a calendar year, or null when the year has no data. */
export function lastAvailableInYear(series: SeriesLike, year: number): MonthlyPoint | null {
  for (let month = 12; month >= 1; month -= 1) {
    const value = valueAt(series, { year, month })
    if (value !== null) return { year, month, value }
  }
  return null
}

export function seriesYears(series: SeriesLike): number[] {
  const years = new Set<number>()
  series.values.forEach((value, index) => { if (value !== null) years.add(monthAt(series, index).year) })
  return [...years].sort((a, b) => a - b)
}

/** Published points in a range, inclusive on both ends. */
export function seriesPoints(series: SeriesLike, from?: MonthKey, to?: MonthKey): MonthlyPoint[] {
  const points: MonthlyPoint[] = []
  series.values.forEach((value, index) => {
    if (value === null) return
    const key = monthAt(series, index)
    if (from && compareMonths(key, from) < 0) return
    if (to && compareMonths(key, to) > 0) return
    points.push({ ...key, value })
  })
  return points
}

/** The latest month that every series has published. */
export function commonLastMonth(...series: SeriesLike[]): MonthKey | null {
  const lasts = series.map(lastAvailable)
  if (lasts.some((point) => point === null)) return null
  const { year, month } = (lasts as MonthlyPoint[]).reduce((earliest, point) => (compareMonths(point, earliest) < 0 ? point : earliest))
  return { year, month }
}

export function earliestCommonMonth(...series: SeriesLike[]): MonthKey | null {
  const firsts = series.map(firstAvailable)
  if (firsts.some((point) => point === null)) return null
  const { year, month } = (firsts as MonthlyPoint[]).reduce((latest, point) => (compareMonths(point, latest) > 0 ? point : latest))
  return { year, month }
}
