export type AmortizationRow = { month: number; payment: number; interest: number; principal: number; balance: number }
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback
const nonNegative = (value: number) => Math.max(0, finite(value))

export function compoundSavings(principal: number, annualRatePercent: number, months: number, monthlyContribution = 0) {
  const p = nonNegative(principal)
  const n = Math.max(0, Math.floor(nonNegative(months)))
  const monthlyRate = nonNegative(annualRatePercent) / 100 / 12
  let balance = p
  let contributed = p
  const schedule: Array<{ month: number; opening: number; contribution: number; interest: number; closing: number }> = []
  for (let month = 1; month <= n; month += 1) {
    const opening = balance
    const contribution = nonNegative(monthlyContribution)
    const interest = opening * monthlyRate
    balance = opening + interest + contribution
    contributed += contribution
    schedule.push({ month, opening, contribution, interest, closing: balance })
  }
  return { total: balance, principal: p, contributions: contributed - p, contributed, interest: balance - contributed, schedule }
}

export function loanAmortization(principal: number, annualRatePercent: number, months: number): { payment: number; totalPaid: number; totalInterest: number; schedule: AmortizationRow[] } {
  const amount = nonNegative(principal)
  const n = Math.max(1, Math.floor(nonNegative(months)))
  const monthlyRate = finite(annualRatePercent) / 100 / 12
  const payment = monthlyRate === 0 ? amount / n : amount * monthlyRate * (1 + monthlyRate) ** n / ((1 + monthlyRate) ** n - 1)
  let balance = amount
  const schedule: AmortizationRow[] = []
  for (let month = 1; month <= n; month += 1) {
    const interest = balance * monthlyRate
    const principalPart = Math.min(balance, Math.max(0, payment - interest))
    balance = Math.max(0, balance - principalPart)
    schedule.push({ month, payment: month === n ? principalPart + interest : payment, interest, principal: principalPart, balance })
  }
  const totalPaid = schedule.reduce((sum, row) => sum + row.payment, 0)
  return { payment, totalPaid, totalInterest: totalPaid - amount, schedule }
}

function dateAtNoon(iso: string) {
  const value = new Date(`${iso}T12:00:00`)
  return Number.isNaN(value.getTime()) ? null : value
}
export function dateDifference(startIso: string, endIso: string) {
  const start = dateAtNoon(startIso); const end = dateAtNoon(endIso)
  if (!start || !end) return { days: 0, weeks: 0, months: 0, years: 0, valid: false }
  const sign = end >= start ? 1 : -1
  const first = sign > 0 ? start : end; const last = sign > 0 ? end : start
  const days = Math.round((last.getTime() - first.getTime()) / 86400000)
  let years = last.getFullYear() - first.getFullYear()
  let months = last.getMonth() - first.getMonth()
  let day = last.getDate() - first.getDate()
  if (day < 0) { months -= 1; const previousMonth = new Date(last.getFullYear(), last.getMonth(), 0).getDate(); day += previousMonth }
  if (months < 0) { years -= 1; months += 12 }
  return { days: days * sign, weeks: Math.floor(days / 7) * sign, months: (years * 12 + months) * sign, years: years * sign, remainingMonths: months, remainingDays: day, valid: true }
}
export function roi(initial: number, finalValue: number, inflationPercent = 0) {
  const base = finite(initial); const nominal = base === 0 ? 0 : (finite(finalValue) - base) / base
  const real = (1 + nominal) / (1 + finite(inflationPercent) / 100) - 1
  return { nominalPercent: nominal * 100, realPercent: real * 100, profit: finite(finalValue) - base }
}
export function vat(amount: number, ratePercent: number, mode: 'add' | 'remove') {
  const value = nonNegative(amount); const rate = Math.max(0, finite(ratePercent)) / 100
  if (mode === 'remove') { const net = rate === -1 ? value : value / (1 + rate); return { net, tax: value - net, gross: value } }
  return { net: value, tax: value * rate, gross: value * (1 + rate) }
}
export type UnitKind = 'length' | 'mass' | 'area' | 'volume' | 'speed' | 'temperature' | 'data'
const units: Record<Exclude<UnitKind, 'temperature'>, Record<string, number>> = {
  length: { m: 1, km: 1000, cm: .01, mm: .001, mi: 1609.344, yd: .9144, ft: .3048, in: .0254 },
  mass: { kg: 1, g: .001, mg: .000001, lb: .45359237, oz: .0283495231 },
  area: { sqm: 1, sqft: .09290304, acre: 4046.8564224, hectare: 10000 },
  volume: { l: 1, ml: .001, m3: 1000, gal: 3.785411784, cup: .2365882365 },
  speed: { kmh: 1, mph: 1.609344, ms: 3.6, knot: 1.852 },
  data: { byte: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 },
}
export function convertUnit(value: number, kind: UnitKind, from: string, to: string) {
  const raw = finite(value)
  if (kind === 'temperature') { const c = from === 'F' ? (raw - 32) * 5 / 9 : from === 'K' ? raw - 273.15 : raw; return to === 'F' ? c * 9 / 5 + 32 : to === 'K' ? c + 273.15 : c }
  const table = units[kind]; if (!table?.[from] || !table?.[to]) throw new Error('Unknown unit')
  return raw * table[from] / table[to]
}
export function bmi(heightCm: number, weightKg: number) { const heightM = finite(heightCm) / 100; return heightM > 0 ? nonNegative(weightKg) / (heightM * heightM) : 0 }
export function tdee(weightKg: number, heightCm: number, age: number, gender: 'male' | 'female', activity: number) { const bmr = gender === 'male' ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5 : 10 * weightKg + 6.25 * heightCm - 5 * age - 161; return { bmr, tdee: bmr * activity } }

export type PercentageMode = 'of' | 'change' | 'increase' | 'decrease' | 'ratio'
/** Everyday percentage questions. `a` is the base number; `b` is a percentage or the second number. */
export function percentageCalculation(mode: PercentageMode, a: number, b: number) {
  const x = finite(a), y = finite(b)
  if (mode === 'of') return { result: x * y / 100, valid: true }
  if (mode === 'increase') return { result: x * (1 + y / 100), valid: true }
  if (mode === 'decrease') return { result: x * (1 - y / 100), valid: true }
  if (mode === 'change') return x === 0 ? { result: 0, valid: false } : { result: (y - x) / x * 100, valid: true }
  return y === 0 ? { result: 0, valid: false } : { result: x / y * 100, valid: true }
}

/** Weekdays from the start date (inclusive) to the end date (exclusive), matching the day count. */
export function weekdaysBetween(startIso: string, endIso: string) {
  const start = dateAtNoon(startIso); const end = dateAtNoon(endIso)
  if (!start || !end) return 0
  const [first, last] = start <= end ? [start, end] : [end, start]
  let count = 0
  for (const cursor = new Date(first); cursor < last; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) count += 1
  }
  return count
}

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese'
export const BMI_THRESHOLDS = { underweight: 18.5, normal: 25, overweight: 30 } as const
export function bmiCategory(value: number): BmiCategory {
  if (value < BMI_THRESHOLDS.underweight) return 'underweight'
  if (value < BMI_THRESHOLDS.normal) return 'normal'
  if (value < BMI_THRESHOLDS.overweight) return 'overweight'
  return 'obese'
}
/** Weight range (kg) that keeps the BMI inside the normal band for a height. */
export function healthyWeightRange(heightCm: number) {
  const heightM = finite(heightCm) / 100
  if (heightM <= 0) return { min: 0, max: 0 }
  return { min: BMI_THRESHOLDS.underweight * heightM * heightM, max: (BMI_THRESHOLDS.normal - 0.1) * heightM * heightM }
}
