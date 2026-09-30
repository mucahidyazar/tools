/**
 * Forward-looking growth projection shared by the investment, savings and compound-interest
 * calculators. Everything is simulated month by month so contribution timing, contribution
 * frequency and compounding frequency all combine consistently.
 */
export type ContributionFrequency = 'monthly' | 'yearly'
export type Compounding = 'daily' | 'monthly' | 'quarterly' | 'yearly'
export type RateKind = 'apr' | 'apy'
export type ContributionTiming = 'start' | 'end'

/**
 * Exchange-rate path for contributions made in another currency: `startRate` account-currency units per
 * contribution unit today, moving `annualChangePercent` a year (relative purchasing-power parity when derived
 * from the two inflation estimates).
 */
export type ContributionConversion = { startRate: number; annualChangePercent: number }

export type GrowthInput = {
  initial: number
  /** Amount added per contribution period in the contribution currency; 0 disables contributions. */
  contribution: number
  /** Present when contributions are paid in another currency than the account. */
  conversion?: ContributionConversion
  contributionFrequency: ContributionFrequency
  annualRatePercent: number
  /** APR is a nominal rate compounded `compounding` times a year; APY is the effective annual rate. */
  rateKind: RateKind
  compounding: Compounding
  months: number
  timing: ContributionTiming
}
/** `contribution` is in account currency; `contributionForeign` is the amount paid in the contribution currency at `rate`. */
export type GrowthPoint = { index: number; year: number; monthOfYear: number; opening: number; contribution: number; contributionForeign: number; rate: number; interest: number; principal: number; value: number }
export type GrowthYear = { year: number; opening: number; contributions: number; contributionsForeign: number; interest: number; closing: number; principal: number; months: number }
export type GrowthResult = {
  input: GrowthInput
  finalValue: number
  principal: number
  contributions: number
  /** Total paid in the contribution currency; equals `contributions` when there is no conversion. */
  contributionsForeign: number
  /** Account-currency units per contribution unit at the end of the horizon (1 without conversion). */
  endRate: number
  gain: number
  totalReturnPercent: number
  effectiveAnnualPercent: number
  monthlyFactor: number
  doublingYears: number | null
  path: GrowthPoint[]
  yearly: GrowthYear[]
}

export const MAX_MONTHS = 1200
export const COMPOUNDING_PERIODS: Readonly<Record<Compounding, number>> = { daily: 365, monthly: 12, quarterly: 4, yearly: 1 }
const finite = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback)

/** Effective annual rate (APY) for the given nominal rate and compounding frequency. */
export function effectiveAnnualRate(annualRatePercent: number, rateKind: RateKind, compounding: Compounding) {
  const rate = Math.max(-100, finite(annualRatePercent)) / 100
  if (rateKind === 'apy') return rate
  const periods = COMPOUNDING_PERIODS[compounding]
  return (1 + rate / periods) ** periods - 1
}

/** Growth multiplier applied to a balance over one month. */
export function monthlyGrowthFactor(annualRatePercent: number, rateKind: RateKind, compounding: Compounding) {
  const effective = effectiveAnnualRate(annualRatePercent, rateKind, compounding)
  return effective <= -1 ? 0 : (1 + effective) ** (1 / 12)
}

export function normalizeGrowthInput(input: GrowthInput): GrowthInput {
  const conversion = input.conversion && Number.isFinite(input.conversion.startRate) && input.conversion.startRate > 0
    ? { startRate: input.conversion.startRate, annualChangePercent: Math.max(-99, finite(input.conversion.annualChangePercent)) }
    : undefined
  return {
    ...input,
    conversion,
    initial: Math.max(0, finite(input.initial)),
    contribution: Math.max(0, finite(input.contribution)),
    annualRatePercent: Math.min(1000, Math.max(-100, finite(input.annualRatePercent))),
    months: Math.min(MAX_MONTHS, Math.max(1, Math.round(finite(input.months, 1)))),
  }
}

export function projectGrowth(rawInput: GrowthInput): GrowthResult {
  const input = normalizeGrowthInput(rawInput)
  const factor = monthlyGrowthFactor(input.annualRatePercent, input.rateKind, input.compounding)
  const contributes = (index: number) => input.contribution > 0 && (input.contributionFrequency === 'monthly' || (input.timing === 'start' ? index % 12 === 1 : index % 12 === 0))
  // A start-of-period contribution is paid before the month's growth, an end-of-period one after it.
  const rateAt = (months: number) => (input.conversion ? input.conversion.startRate * (1 + input.conversion.annualChangePercent / 100) ** (months / 12) : 1)
  let value = input.initial
  let principal = input.initial
  let contributionsForeign = 0
  const path: GrowthPoint[] = []
  for (let index = 1; index <= input.months; index += 1) {
    const opening = value
    const rate = rateAt(input.timing === 'start' ? index - 1 : index)
    const contributionForeign = contributes(index) ? input.contribution : 0
    const contribution = contributionForeign * rate
    if (contribution && input.timing === 'start') value += contribution
    const interest = value * (factor - 1)
    value += interest
    if (contribution && input.timing === 'end') value += contribution
    principal += contribution
    contributionsForeign += contributionForeign
    path.push({ index, year: Math.ceil(index / 12), monthOfYear: ((index - 1) % 12) + 1, opening, contribution, contributionForeign, rate, interest, principal, value })
  }
  const yearly = path.reduce<GrowthYear[]>((years, point) => {
    const current = years[years.length - 1]
    if (current && current.year === point.year) return [...years.slice(0, -1), { ...current, contributions: current.contributions + point.contribution, contributionsForeign: current.contributionsForeign + point.contributionForeign, interest: current.interest + point.interest, closing: point.value, principal: point.principal, months: current.months + 1 }]
    return [...years, { year: point.year, opening: point.opening, contributions: point.contribution, contributionsForeign: point.contributionForeign, interest: point.interest, closing: point.value, principal: point.principal, months: 1 }]
  }, [])
  const effective = effectiveAnnualRate(input.annualRatePercent, input.rateKind, input.compounding)
  const contributions = principal - input.initial
  return {
    input, finalValue: value, principal, contributions, contributionsForeign, endRate: rateAt(input.months), gain: value - principal,
    totalReturnPercent: principal > 0 ? (value / principal - 1) * 100 : 0,
    effectiveAnnualPercent: effective * 100, monthlyFactor: factor,
    doublingYears: effective > 0 ? Math.log(2) / Math.log(1 + effective) : null,
    path, yearly,
  }
}

export type RealGrowthPoint = { index: number; deflator: number; realValue: number; realPrincipal: number }
export type RealGrowthYear = { year: number; realClosing: number; realPrincipal: number; inflationLoss: number }
/** The projection restated in start-date purchasing power under a constant annual inflation rate. */
export type RealGrowth = {
  inflationPercent: number
  /** Final value deflated to start-date money. */
  realFinalValue: number
  /** Initial amount plus every contribution deflated from the month it was paid. */
  realPrincipal: number
  realGain: number
  realReturnPercent: number
  /** Fisher real rate: (1 + effective annual) / (1 + inflation) − 1. */
  realAnnualPercent: number
  /** Purchasing power lost to inflation: nominal final value minus real final value. */
  inflationLoss: number
  path: RealGrowthPoint[]
  yearly: RealGrowthYear[]
}

export function adjustGrowthForInflation(result: GrowthResult, annualInflationPercent: number): RealGrowth {
  const inflation = Math.min(1000, Math.max(-99, finite(annualInflationPercent))) / 100
  const deflator = (months: number) => (1 + inflation) ** (months / 12)
  // A start-of-period contribution is paid before the month's growth, an end-of-period one after it.
  const paidAt = (index: number) => (result.input.timing === 'start' ? index - 1 : index)
  let realPrincipal = result.input.initial
  const path = result.path.map((point) => {
    realPrincipal += point.contribution / deflator(paidAt(point.index))
    return { index: point.index, deflator: deflator(point.index), realValue: point.value / deflator(point.index), realPrincipal }
  })
  let offset = 0
  const yearly = result.yearly.map((year) => {
    offset += year.months
    const last = path[offset - 1]
    return { year: year.year, realClosing: last.realValue, realPrincipal: last.realPrincipal, inflationLoss: year.closing - last.realValue }
  })
  const last = path[path.length - 1]
  const realFinalValue = last?.realValue ?? result.input.initial
  const realPrincipalTotal = last?.realPrincipal ?? result.input.initial
  const effective = result.effectiveAnnualPercent / 100
  return {
    inflationPercent: inflation * 100, realFinalValue, realPrincipal: realPrincipalTotal, realGain: realFinalValue - realPrincipalTotal,
    realReturnPercent: realPrincipalTotal > 0 ? (realFinalValue / realPrincipalTotal - 1) * 100 : 0,
    realAnnualPercent: ((1 + effective) / (1 + inflation) - 1) * 100,
    inflationLoss: result.finalValue - realFinalValue, path, yearly,
  }
}
