/** "What if I had invested" arithmetic over the bundled monthly market series. Informational only. */
import { SERIES, type MonthlySeries } from './generated/series'
import { CPI_SERIES, type CountryCode } from './economic-data'
import { commonLastMonth, compareMonths, earliestCommonMonth, lastAvailable, nextMonth, valueAt, type MonthKey, type MonthlyPoint } from './series'

export type CurrencyCode = 'TRY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'INR' | 'CNY' | 'CHF' | 'CAD' | 'AUD'
export const CURRENCY_CODES: readonly CurrencyCode[] = ['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CNY', 'INR', 'CAD', 'AUD']
export type AssetId = CurrencyCode | 'GOLD' | 'NASDAQ' | 'DEPOSIT'
export const ASSET_IDS: readonly AssetId[] = ['USD', 'EUR', 'GOLD', 'DEPOSIT', 'GBP', 'NASDAQ', 'CHF', 'JPY', 'CNY', 'INR', 'CAD', 'AUD', 'TRY']
export const DEFAULT_WITHHOLDING_PERCENT = 15
export const TROY_OUNCE_GRAMS = 31.1034768
export const CPI_COUNTRY_FOR_CURRENCY: Readonly<Partial<Record<CurrencyCode, CountryCode>>> = { TRY: 'TR', USD: 'US', GBP: 'GB', EUR: 'DE' }

/** Exchange-rate series per currency; `perUsd` tells whether the series is quoted as currency units per dollar. */
const CURRENCY_SERIES: Readonly<Record<CurrencyCode, { series: MonthlySeries; perUsd: boolean } | null>> = {
  USD: null,
  TRY: { series: SERIES['usd-try'], perUsd: true },
  EUR: { series: SERIES['eur-usd'], perUsd: false },
  GBP: { series: SERIES['gbp-usd'], perUsd: false },
  JPY: { series: SERIES['jpy-usd'], perUsd: true },
  INR: { series: SERIES['inr-usd'], perUsd: true },
  CNY: { series: SERIES['cny-usd'], perUsd: true },
  CHF: { series: SERIES['chf-usd'], perUsd: true },
  CAD: { series: SERIES['cad-usd'], perUsd: true },
  AUD: { series: SERIES['aud-usd'], perUsd: false },
}

export function isCurrency(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (CURRENCY_CODES as readonly string[]).includes(value)
}

/** Units of `currency` per one US dollar for a month. */
export function usdRate(currency: CurrencyCode, key: MonthKey): number | null {
  const entry = CURRENCY_SERIES[currency]
  if (!entry) return 1
  const value = valueAt(entry.series, key)
  if (value === null || value <= 0) return null
  return entry.perUsd ? value : 1 / value
}

/** Latest published cross rate: units of `to` per one unit of `from`, at the last month both currencies are quoted. */
export function latestExchangeRate(from: CurrencyCode, to: CurrencyCode): { rate: number; month: MonthKey | null } | null {
  if (from === to) return { rate: 1, month: null }
  const sources = [CURRENCY_SERIES[from]?.series, CURRENCY_SERIES[to]?.series].filter((series): series is MonthlySeries => Boolean(series))
  const month = commonLastMonth(...sources)
  if (!month) return null
  const toRate = usdRate(to, month), fromRate = usdRate(from, month)
  return toRate === null || fromRate === null ? null : { rate: toRate / fromRate, month }
}

/** Series that must be published for the asset to be priced in the base currency. */
export function assetSources(asset: AssetId, base: CurrencyCode = 'TRY', contributionCurrency: CurrencyCode = base): MonthlySeries[] {
  const list: MonthlySeries[] = []
  const add = (series: MonthlySeries | null | undefined) => { if (series && !list.includes(series)) list.push(series) }
  if (asset === 'DEPOSIT') add(SERIES['try-rate'])
  else if (asset === 'GOLD') add(SERIES['gold-usd'])
  else if (asset === 'NASDAQ') add(SERIES.nasdaq)
  else add(CURRENCY_SERIES[asset]?.series)
  add(CURRENCY_SERIES[base]?.series)
  add(CURRENCY_SERIES[contributionCurrency]?.series)
  return list
}

/** Price of one asset unit in the base currency; deposits (Turkish lira only) return the annual rate in percent. */
export function assetPrice(asset: AssetId, key: MonthKey, base: CurrencyCode = 'TRY'): number | null {
  if (asset === 'DEPOSIT') return base === 'TRY' ? valueAt(SERIES['try-rate'], key) : null
  const baseRate = usdRate(base, key)
  if (baseRate === null) return null
  if (asset === 'GOLD') { const ounce = valueAt(SERIES['gold-usd'], key); return ounce === null ? null : (ounce / TROY_OUNCE_GRAMS) * baseRate }
  if (asset === 'NASDAQ') { const index = valueAt(SERIES.nasdaq, key); return index === null ? null : index * baseRate }
  if (asset === base) return null
  const assetRate = usdRate(asset, key)
  return assetRate === null ? null : baseRate / assetRate
}

/** Dollar price of gold and NASDAQ, used to separate the asset's own move from the exchange rate. */
export function assetUsdPrice(asset: AssetId, key: MonthKey): number | null {
  if (asset === 'GOLD') { const ounce = valueAt(SERIES['gold-usd'], key); return ounce === null ? null : ounce / TROY_OUNCE_GRAMS }
  if (asset === 'NASDAQ') return valueAt(SERIES.nasdaq, key)
  return null
}

export function assetCoverage(asset: AssetId, base: CurrencyCode = 'TRY', contributionCurrency: CurrencyCode = base): { first: MonthKey; last: MonthKey } | null {
  if (asset === base || (asset === 'DEPOSIT' && base !== 'TRY')) return null
  const sources = assetSources(asset, base, contributionCurrency)
  if (sources.length === 0) return null
  const first = earliestCommonMonth(...sources)
  const last = commonLastMonth(...sources)
  return first && last ? { first, last } : null
}

export type InvestmentPlanKind = 'lump' | 'periodic' | 'periodic-units'
/**
 * `amount` is base currency for lump plans, contribution currency for periodic plans, and asset units
 * for periodic-units. `initial` adds a one-time base-currency purchase at the start of a periodic plan.
 */
export type InvestmentPlan = { kind: InvestmentPlanKind; amount: number; initial?: number }
export type ContributionFrequency = 'monthly' | 'yearly'
/** `inflationCountry` picks the CPI used for the real-return comparison; it defaults to the country of the base currency. */
export type InvestmentOptions = { base?: CurrencyCode; contributionCurrency?: CurrencyCode; frequency?: ContributionFrequency; withholdingPercent?: number; inflationCountry?: CountryCode }

export type InvestmentPoint = {
  year: number
  month: number
  /** Base-currency price of one unit that month; for deposits the annual rate in percent. */
  price: number
  contribution: number
  unitsBought: number
  units: number
  invested: number
  value: number
  /** Interest credited during the month (deposits only). */
  interest: number
  /** True when the provider published no value for the month and the previous month's price or rate was carried forward. */
  estimated: boolean
}
export type InvestmentYear = { year: number; invested: number; cumulativeInvested: number; units: number; value: number; interest: number; returnPercent: number }
export type InvestmentOutcome = {
  plan: InvestmentPlan
  asset: AssetId
  base: CurrencyCode
  contributionCurrency: CurrencyCode
  frequency: ContributionFrequency
  start: MonthKey
  end: MonthKey
  startPrice: number
  endPrice: number
  months: number
  contributions: number
  totalInvested: number
  units: number
  averageCost: number | null
  value: number
  profit: number
  nominalReturnPercent: number
  /** Money-weighted (IRR) annual return; equals CAGR for a single payment. */
  annualizedReturnPercent: number | null
  /** Gold and NASDAQ moves in dollars, excluding the exchange rate (lump sums only). */
  usdReturnPercent: number | null
  path: InvestmentPoint[]
  yearly: InvestmentYear[]
  /**
   * Comparison with the chosen country's CPI on the last month where both series exist. Each contribution is
   * inflated separately from the month it was paid; `realProfit` is the value that month minus those inflated contributions.
   */
  inflation: { country: CountryCode; through: MonthKey; adjustedInvested: number; investedThrough: number; valueThrough: number; realProfit: number; realReturnPercent: number; periodInflationPercent: number | null; annualizedInflationPercent: number | null } | null
  deposit: { withholdingPercent: number; startRatePercent: number; endRatePercent: number; averageRatePercent: number; totalInterest: number } | null
}

/** CPI level for a month, falling back to the latest published level within the previous six months (some providers skip months). */
function cpiLevel(cpi: MonthlySeries, key: MonthKey): number | null {
  let probe = key
  for (let back = 0; back <= 6; back += 1) {
    const level = valueAt(cpi, probe)
    if (level !== null) return level
    probe = probe.month === 1 ? { year: probe.year - 1, month: 12 } : { year: probe.year, month: probe.month - 1 }
  }
  return null
}

/** Internal rate of return per period for cash flows with a single sign change, via bisection. */
export function periodicIrr(cashflows: readonly number[]): number | null {
  const npv = (rate: number) => cashflows.reduce((sum, flow, index) => sum + flow / (1 + rate) ** index, 0)
  let low = -0.99, high = 10
  const lowValue = npv(low), highValue = npv(high)
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || Math.sign(lowValue) === Math.sign(highValue)) return null
  for (let iteration = 0; iteration < 200 && high - low > 1e-9; iteration += 1) {
    const middle = (low + high) / 2
    if (Math.sign(npv(middle)) === Math.sign(lowValue)) low = middle
    else high = middle
  }
  return (low + high) / 2
}

/**
 * Simulates buying at each month's average price. Contributions happen at the start of a month and
 * assets are valued at that month's price. Deposits earn one twelfth of the month's annual rate
 * (net of withholding) and the interest is added to the balance at month end, so the balance shown
 * for a month is its closing balance. Months the provider skipped carry the previous value forward.
 */
export function investmentOutcome(plan: InvestmentPlan, asset: AssetId, start: MonthKey, options: InvestmentOptions = {}): InvestmentOutcome | null {
  const base = options.base ?? 'TRY'
  const contributionCurrency = options.contributionCurrency ?? base
  const frequency = options.frequency ?? 'monthly'
  const initial = plan.kind === 'lump' ? 0 : Math.max(0, Number.isFinite(plan.initial ?? 0) ? (plan.initial ?? 0) : 0)
  if (!Number.isFinite(plan.amount) || plan.amount < 0 || (plan.amount === 0 && initial === 0)) return null
  const coverage = assetCoverage(asset, base, contributionCurrency)
  if (!coverage || compareMonths(start, coverage.first) < 0 || compareMonths(start, coverage.last) >= 0) return null
  const startPrice = assetPrice(asset, start, base)
  if (startPrice === null || (asset !== 'DEPOSIT' && startPrice <= 0)) return null
  const deposit = asset === 'DEPOSIT'
  const kind: InvestmentPlanKind = deposit && plan.kind === 'periodic-units' ? 'periodic' : plan.kind
  const withholdingPercent = Math.min(100, Math.max(0, options.withholdingPercent ?? DEFAULT_WITHHOLDING_PERCENT))
  const keep = 1 - withholdingPercent / 100
  const conversion = (key: MonthKey) => { if (contributionCurrency === base) return 1; const to = usdRate(base, key), from = usdRate(contributionCurrency, key); return to === null || from === null ? null : to / from }
  const path: InvestmentPoint[] = []
  const cashflows: number[] = []
  let units = 0, balance = 0, invested = 0, index = 0, lastPrice = startPrice, lastConversion = conversion(start) ?? 1
  for (let key = start; compareMonths(key, coverage.last) <= 0; key = nextMonth(key), index += 1) {
    const published = assetPrice(asset, key, base)
    const estimated = published === null
    const price = published ?? lastPrice
    lastPrice = price
    const rate = conversion(key) ?? lastConversion
    lastConversion = rate
    const contributes = plan.amount > 0 && (kind === 'lump' ? index === 0 : frequency === 'monthly' || index % 12 === 0)
    let contribution = index === 0 ? initial : 0, unitsBought = 0
    if (contributes) {
      if (kind === 'periodic-units' && !deposit) { unitsBought += plan.amount; contribution += plan.amount * price }
      else contribution += kind === 'lump' ? plan.amount : plan.amount * rate
    }
    if (contribution > 0) {
      if (!deposit && kind !== 'periodic-units') unitsBought = contribution / price
      else if (!deposit && index === 0 && initial > 0) unitsBought += initial / price
      units += unitsBought
      invested += contribution
      if (deposit) balance += contribution
    }
    const interest = deposit ? balance * (price / 100 / 12) * keep : 0
    if (deposit) balance += interest
    const value = deposit ? balance : units * price
    path.push({ year: key.year, month: key.month, price, contribution, unitsBought, units, invested, value, interest, estimated })
    cashflows.push(-contribution)
  }
  if (path.length < 2) return null
  const last = path[path.length - 1]
  const value = last.value
  cashflows[cashflows.length - 1] += value
  const monthlyRate = periodicIrr(cashflows)
  const annualizedReturnPercent = monthlyRate === null ? null : ((1 + monthlyRate) ** 12 - 1) * 100
  const usdStart = assetUsdPrice(asset, start), usdEnd = assetUsdPrice(asset, coverage.last)
  const usdReturnPercent = kind === 'lump' && base !== 'USD' && usdStart && usdEnd ? (usdEnd / usdStart - 1) * 100 : null

  const yearly = path.reduce<InvestmentYear[]>((years, point) => {
    const current = years[years.length - 1]
    const returnPercent = point.invested > 0 ? (point.value / point.invested - 1) * 100 : 0
    if (current && current.year === point.year) return [...years.slice(0, -1), { ...current, invested: current.invested + point.contribution, cumulativeInvested: point.invested, units: point.units, value: point.value, interest: current.interest + point.interest, returnPercent }]
    return [...years, { year: point.year, invested: point.contribution, cumulativeInvested: point.invested, units: point.units, value: point.value, interest: point.interest, returnPercent }]
  }, [])

  let inflation: InvestmentOutcome['inflation'] = null
  const country = options.inflationCountry ?? CPI_COUNTRY_FOR_CURRENCY[base]
  if (country) {
    const cpi = CPI_SERIES[country]
    const cpiLast = lastAvailable(cpi)
    const through = cpiLast && compareMonths(cpiLast, coverage.last) < 0 ? { year: cpiLast.year, month: cpiLast.month } : coverage.last
    const cpiThrough = cpiLevel(cpi, through)
    const pointThrough = path.find((point) => point.year === through.year && point.month === through.month)
    if (cpiThrough !== null && pointThrough && compareMonths(through, start) > 0) {
      let adjustedInvested = 0, investedThrough = 0, complete = true
      for (const point of path) {
        if (compareMonths(point, through) > 0 || point.contribution === 0) continue
        const level = cpiLevel(cpi, point)
        if (level === null) { complete = false; break }
        adjustedInvested += point.contribution * (cpiThrough / level)
        investedThrough += point.contribution
      }
      const cpiStart = cpiLevel(cpi, start)
      const span = (through.year - start.year) * 12 + (through.month - start.month)
      const periodInflationPercent = cpiStart ? (cpiThrough / cpiStart - 1) * 100 : null
      const annualizedInflationPercent = cpiStart && span > 0 ? ((cpiThrough / cpiStart) ** (12 / span) - 1) * 100 : null
      if (complete && adjustedInvested > 0) inflation = { country, through, adjustedInvested, investedThrough, valueThrough: pointThrough.value, realProfit: pointThrough.value - adjustedInvested, realReturnPercent: (pointThrough.value / adjustedInvested - 1) * 100, periodInflationPercent, annualizedInflationPercent }
    }
  }
  const rates = deposit ? path.map((point) => point.price) : []
  return {
    plan: { kind, amount: plan.amount, initial }, asset, base, contributionCurrency, frequency, start, end: coverage.last, startPrice, endPrice: last.price, months: path.length,
    contributions: path.filter((point) => point.contribution > 0).length, totalInvested: invested, units, averageCost: !deposit && units > 0 ? invested / units : null,
    value, profit: value - invested, nominalReturnPercent: invested > 0 ? (value / invested - 1) * 100 : 0, annualizedReturnPercent, usdReturnPercent, path, yearly, inflation,
    deposit: deposit ? { withholdingPercent, startRatePercent: rates[0], endRatePercent: rates[rates.length - 1], averageRatePercent: rates.reduce((sum, rate) => sum + rate, 0) / rates.length, totalInterest: path.reduce((sum, point) => sum + point.interest, 0) } : null,
  }
}

/** Amount needed each month to keep the starting purchasing power, using the given country's CPI (default: the base currency's country). */
export function inflationPath(amount: number, start: MonthKey, base: CurrencyCode = 'TRY', country: CountryCode | undefined = CPI_COUNTRY_FOR_CURRENCY[base]): MonthlyPoint[] {
  if (!country) return []
  const cpi = CPI_SERIES[country]
  const first = valueAt(cpi, start)
  const last = lastAvailable(cpi)
  if (!first || !last || !Number.isFinite(amount)) return []
  const points: MonthlyPoint[] = []
  for (let key = start; compareMonths(key, last) <= 0; key = nextMonth(key)) {
    const level = valueAt(cpi, key)
    if (level !== null) points.push({ ...key, value: amount * (level / first) })
  }
  return points
}
