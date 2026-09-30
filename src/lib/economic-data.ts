/**
 * Consumer price index helpers over the bundled monthly series (see src/data/SOURCES.md).
 * Everything is computed locally from the index level, so month-over-month, annual and
 * multi-year comparisons all agree with each other.
 */
import { DATA_GENERATED_AT, SERIES, type MonthlySeries } from './generated/series'
import { firstAvailable, lastAvailable, lastAvailableInYear, seriesYears, valueAt, yearAverage, type MonthKey, type MonthlyPoint } from './series'

export type CountryCode = 'TR' | 'US' | 'GB' | 'DE'
export const COUNTRY_CODES: readonly CountryCode[] = ['TR', 'US', 'GB', 'DE']
export const COUNTRY_CURRENCY: Readonly<Record<CountryCode, string>> = { TR: 'TRY', US: 'USD', GB: 'GBP', DE: 'EUR' }
export const CPI_SERIES: Readonly<Record<CountryCode, MonthlySeries>> = { TR: SERIES['cpi-tr'], US: SERIES['cpi-us'], GB: SERIES['cpi-gb'], DE: SERIES['cpi-de'] }
export const SOURCE_URLS: Readonly<Record<CountryCode, string>> = { TR: CPI_SERIES.TR.url, US: CPI_SERIES.US.url, GB: CPI_SERIES.GB.url, DE: CPI_SERIES.DE.url }
export const DATA_LAST_UPDATED = DATA_GENERATED_AT
export const COUNTRY_NAMES: Readonly<Record<CountryCode, Readonly<Record<'tr' | 'en' | 'ru', string>>>> = { TR: { tr: 'Türkiye', en: 'Türkiye', ru: 'Турция' }, US: { tr: 'ABD', en: 'United States', ru: 'США' }, GB: { tr: 'Birleşik Krallık', en: 'United Kingdom', ru: 'Великобритания' }, DE: { tr: 'Almanya', en: 'Germany', ru: 'Германия' } }
export type InflationPoint = MonthlyPoint
export type DataCoverage = { first: MonthKey; last: MonthKey; firstYear: number; lastYear: number; source: string; url: string }

export function dataCoverage(country: CountryCode): DataCoverage | null {
  const series = CPI_SERIES[country]
  const first = firstAvailable(series)
  const last = lastAvailable(series)
  if (!first || !last) return null
  return { first: { year: first.year, month: first.month }, last: { year: last.year, month: last.month }, firstYear: first.year, lastYear: last.year, source: series.source, url: series.url }
}

/** Month-over-month percentage changes for one calendar year; January compares with the previous December. */
export function monthlyInflation(country: CountryCode, year: number): InflationPoint[] {
  const series = CPI_SERIES[country]
  const points: InflationPoint[] = []
  for (let month = 1; month <= 12; month += 1) {
    const current = valueAt(series, { year, month })
    const previous = valueAt(series, month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 })
    if (current === null || previous === null) continue
    points.push({ year, month, value: (current / previous - 1) * 100 })
  }
  return points
}

/** Years with at least one computable monthly change. */
export function availableYears(country: CountryCode): number[] {
  return seriesYears(CPI_SERIES[country]).filter((year) => monthlyInflation(country, year).length > 0)
}

/** December-over-December change, or year-to-date when the year is still incomplete. */
export function annualInflation(country: CountryCode, year: number): { value: number; partial: boolean; through: MonthKey } | null {
  const series = CPI_SERIES[country]
  const base = valueAt(series, { year: year - 1, month: 12 })
  const end = lastAvailableInYear(series, year)
  if (base === null || !end) return null
  return { value: (end.value / base - 1) * 100, partial: end.month !== 12, through: { year: end.year, month: end.month } }
}

/** The headline annual figure: the latest published month compared with the same month a year earlier. */
export function latestAnnualInflation(country: CountryCode): { value: number; through: MonthKey } | null {
  const series = CPI_SERIES[country]
  const last = lastAvailable(series)
  if (!last) return null
  const yearEarlier = valueAt(series, { year: last.year - 1, month: last.month })
  if (yearEarlier === null || yearEarlier <= 0) return null
  return { value: (last.value / yearEarlier - 1) * 100, through: { year: last.year, month: last.month } }
}

/** Compound average annual inflation over the last `years` years, ending at the latest published month. */
export function averageAnnualInflation(country: CountryCode, years = 10): { value: number; from: MonthKey; through: MonthKey; years: number } | null {
  const series = CPI_SERIES[country]
  const last = lastAvailable(series)
  if (!last || years <= 0) return null
  const from = { year: last.year - years, month: last.month }
  const start = valueAt(series, from)
  if (start === null || start <= 0) return null
  return { value: ((last.value / start) ** (1 / years) - 1) * 100, from, through: { year: last.year, month: last.month }, years }
}

export type InflationFactor = { factor: number; from: { year: number; months: number; through: MonthKey }; to: { year: number; months: number; through: MonthKey } }

/** Ratio of annual-average price levels; the target year is clamped to the last published year. */
export function inflationFactor(country: CountryCode, fromYear: number, toYear: number): InflationFactor | null {
  const series = CPI_SERIES[country]
  const last = lastAvailable(series)
  if (!last) return null
  const from = yearAverage(series, fromYear)
  const to = yearAverage(series, Math.max(fromYear, Math.min(toYear, last.year)))
  if (!from || !to) return null
  return { factor: to.value / from.value, from: { year: fromYear, months: from.months, through: from.through }, to: { year: to.through.year, months: to.months, through: to.through } }
}

export function adjustForInflation(amount: number, country: CountryCode, fromYear: number, toYear: number) {
  const result = inflationFactor(country, fromYear, toYear)
  if (!result || !Number.isFinite(amount)) return null
  return { value: amount * result.factor, ...result }
}
