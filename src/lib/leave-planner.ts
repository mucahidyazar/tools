/**
 * Leave planning over public holidays and weekly days off. Dates are ISO strings handled in UTC so the
 * arithmetic is timezone-proof. A "stretch" is a run of consecutive days off that contains at least one
 * leave day; the planner maximises the free days (weekends, holidays) those leave days attach.
 */
import { HOLIDAYS, HOLIDAY_COUNTRIES, HOLIDAY_YEARS, HOLIDAYS_GENERATED_AT, type HolidayCountry, type HolidayEntry } from './generated/holidays'

export { HOLIDAY_COUNTRIES, HOLIDAY_YEARS, HOLIDAYS_GENERATED_AT, type HolidayCountry, type HolidayEntry }

/** ISO weekday numbers: Monday = 1 … Sunday = 7. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7
export const WEEKDAYS: readonly IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7]
export const DEFAULT_WEEKEND: readonly IsoWeekday[] = [6, 7]
export const MAX_LEAVE_DAYS = 60
/** Regions (ISO 3166-2) the planner offers; regional holidays of other regions are ignored. */
export const HOLIDAY_REGIONS: Readonly<Partial<Record<HolidayCountry, readonly string[]>>> = {
  GB: ['GB-ENG', 'GB-SCT', 'GB-WLS', 'GB-NIR'],
  DE: ['DE-BW', 'DE-BY', 'DE-BE', 'DE-BB', 'DE-HB', 'DE-HH', 'DE-HE', 'DE-MV', 'DE-NI', 'DE-NW', 'DE-RP', 'DE-SL', 'DE-SN', 'DE-ST', 'DE-SH', 'DE-TH'],
}
export const DEFAULT_REGION: Readonly<Partial<Record<HolidayCountry, string>>> = { GB: 'GB-ENG' }
type Localized = { tr: string; en: string; ru: string }
export const HOLIDAY_COUNTRY_NAMES: Readonly<Record<HolidayCountry, Localized>> = {
  TR: { tr: 'Türkiye', en: 'Türkiye', ru: 'Турция' }, DE: { tr: 'Almanya', en: 'Germany', ru: 'Германия' }, GB: { tr: 'Birleşik Krallık', en: 'United Kingdom', ru: 'Великобритания' }, US: { tr: 'ABD', en: 'United States', ru: 'США' },
  FR: { tr: 'Fransa', en: 'France', ru: 'Франция' }, NL: { tr: 'Hollanda', en: 'Netherlands', ru: 'Нидерланды' }, BE: { tr: 'Belçika', en: 'Belgium', ru: 'Бельгия' }, AT: { tr: 'Avusturya', en: 'Austria', ru: 'Австрия' },
  RU: { tr: 'Rusya', en: 'Russia', ru: 'Россия' }, KZ: { tr: 'Kazakistan', en: 'Kazakhstan', ru: 'Казахстан' },
}
export const HOLIDAY_REGION_NAMES: Readonly<Record<string, Localized>> = {
  'GB-ENG': { tr: 'İngiltere', en: 'England', ru: 'Англия' }, 'GB-SCT': { tr: 'İskoçya', en: 'Scotland', ru: 'Шотландия' }, 'GB-WLS': { tr: 'Galler', en: 'Wales', ru: 'Уэльс' }, 'GB-NIR': { tr: 'Kuzey İrlanda', en: 'Northern Ireland', ru: 'Северная Ирландия' },
  'DE-BW': { tr: 'Baden-Württemberg', en: 'Baden-Württemberg', ru: 'Баден-Вюртемберг' }, 'DE-BY': { tr: 'Bavyera', en: 'Bavaria', ru: 'Бавария' }, 'DE-BE': { tr: 'Berlin', en: 'Berlin', ru: 'Берлин' }, 'DE-BB': { tr: 'Brandenburg', en: 'Brandenburg', ru: 'Бранденбург' },
  'DE-HB': { tr: 'Bremen', en: 'Bremen', ru: 'Бремен' }, 'DE-HH': { tr: 'Hamburg', en: 'Hamburg', ru: 'Гамбург' }, 'DE-HE': { tr: 'Hessen', en: 'Hesse', ru: 'Гессен' }, 'DE-MV': { tr: 'Mecklenburg-Vorpommern', en: 'Mecklenburg-Vorpommern', ru: 'Мекленбург-Передняя Померания' },
  'DE-NI': { tr: 'Aşağı Saksonya', en: 'Lower Saxony', ru: 'Нижняя Саксония' }, 'DE-NW': { tr: 'Kuzey Ren-Vestfalya', en: 'North Rhine-Westphalia', ru: 'Северный Рейн-Вестфалия' }, 'DE-RP': { tr: 'Rheinland-Pfalz', en: 'Rhineland-Palatinate', ru: 'Рейнланд-Пфальц' }, 'DE-SL': { tr: 'Saarland', en: 'Saarland', ru: 'Саар' },
  'DE-SN': { tr: 'Saksonya', en: 'Saxony', ru: 'Саксония' }, 'DE-ST': { tr: 'Saksonya-Anhalt', en: 'Saxony-Anhalt', ru: 'Саксония-Анхальт' }, 'DE-SH': { tr: 'Schleswig-Holstein', en: 'Schleswig-Holstein', ru: 'Шлезвиг-Гольштейн' }, 'DE-TH': { tr: 'Thüringen', en: 'Thuringia', ru: 'Тюрингия' },
}
/** Local names are shown when the interface language matches the country; otherwise the English name, with the local one in brackets. */
export function holidayLabel(entry: HolidayEntry, country: HolidayCountry, language: 'tr' | 'en' | 'ru') {
  const localMatches = (language === 'tr' && country === 'TR') || (language === 'ru' && (country === 'RU' || country === 'KZ'))
  if (localMatches) return entry.local
  return entry.local && entry.local !== entry.name ? `${entry.name} (${entry.local})` : entry.name
}

const DAY_MS = 86_400_000
const FREE_RUN_CAP = 16
/** Objective weights: every captured free day beats any number of leave days or stretches; then fewer leave days; then fewer, longer stretches. */
const ATTACH_WEIGHT = 1000
const LEAVE_COST = 10
const STRETCH_COST = 1
const UNREACHABLE = -1_000_000_000

export function isHolidayCountry(value: unknown): value is HolidayCountry {
  return typeof value === 'string' && (HOLIDAY_COUNTRIES as readonly string[]).includes(value)
}
export function parseIso(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}
export function toIso(time: number) {
  return new Date(time).toISOString().slice(0, 10)
}
export function addDays(iso: string, days: number) {
  return toIso(parseIso(iso) + days * DAY_MS)
}
export function isoWeekday(iso: string): IsoWeekday {
  const day = new Date(parseIso(iso)).getUTCDay()
  return (day === 0 ? 7 : day) as IsoWeekday
}

export type Period = 'next12' | number
export type PeriodRange = { from: string; to: string; clipped: boolean }

/** The planning window: the next twelve months, or a calendar year (the current year starts today). Clipped to the bundled years. */
export function periodRange(period: Period, today: string): PeriodRange | null {
  const year = Number(today.slice(0, 4))
  let from: string, to: string
  if (period === 'next12') { from = today; to = addDays(toIso(Date.UTC(year + 1, Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)))), -1) }
  else if (period === year) { from = today; to = `${year}-12-31` }
  else { from = `${period}-01-01`; to = `${period}-12-31` }
  const first = `${HOLIDAY_YEARS[0]}-01-01`, last = `${HOLIDAY_YEARS[HOLIDAY_YEARS.length - 1]}-12-31`
  const clippedFrom = from < first ? first : from, clippedTo = to > last ? last : to
  if (clippedFrom > clippedTo) return null
  return { from: clippedFrom, to: clippedTo, clipped: clippedFrom !== from || clippedTo !== to }
}

/** Public holidays between two ISO dates (inclusive); regional entries apply only when `region` matches. */
export function holidaysBetween(country: HolidayCountry, from: string, to: string, region?: string | null): HolidayEntry[] {
  const out: HolidayEntry[] = []
  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year += 1) {
    for (const entry of HOLIDAYS[country][year] ?? []) {
      if (entry.date < from || entry.date > to) continue
      if (entry.counties && !(region && entry.counties.includes(region))) continue
      out.push(entry)
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export type CalendarDay = { iso: string; weekday: IsoWeekday; weekend: boolean; holidays: HolidayEntry[]; off: boolean }

export function buildCalendar(from: string, to: string, weekendDays: readonly IsoWeekday[], holidays: readonly HolidayEntry[]): CalendarDay[] {
  const byDate = new Map<string, HolidayEntry[]>()
  for (const holiday of holidays) byDate.set(holiday.date, [...(byDate.get(holiday.date) ?? []), holiday])
  const days: CalendarDay[] = []
  for (let time = parseIso(from); time <= parseIso(to); time += DAY_MS) {
    const iso = toIso(time)
    const weekday = isoWeekday(iso)
    const weekend = weekendDays.includes(weekday)
    const dayHolidays = byDate.get(iso) ?? []
    days.push({ iso, weekday, weekend, holidays: dayHolidays, off: weekend || dayHolidays.length > 0 })
  }
  return days
}

export type Strategy = 'total' | 'longest'
export type Stretch = { start: string; end: string; length: number; leaveDays: string[]; weekendDays: number; holidayDays: number; holidays: HolidayEntry[] }
export type LeavePlan = {
  strategy: Strategy
  budget: number
  leaveDays: string[]
  leaveUsed: number
  leaveLeft: number
  stretches: Stretch[]
  /** Days off inside stretches, leave days included. */
  totalOffDays: number
  /** Weekend and holiday days the leave days attach; equals totalOffDays − leaveUsed. */
  attachedFreeDays: number
  longest: Stretch | null
  /** Days off per leave day used, or null when no leave is used. */
  ratio: number | null
}

/**
 * Dynamic programme over the calendar: state = (leave used, pending free run, inside a stretch). Taking a leave
 * day attaches the free days just before it and every free day after it, so the main term is exactly the number
 * of weekend and holiday days that end up inside stretches. Each leave day and each new stretch cost a little, so
 * days that would attach nothing stay unused and equal plans merge into fewer, longer breaks.
 */
function bestBridges(calendar: readonly CalendarDay[], budget: number): string[] {
  const total = calendar.length
  if (budget <= 0 || total === 0) return []
  const K = budget + 1, R = FREE_RUN_CAP + 1
  const index = (day: number, used: number, run: number, inside: number) => ((day * K + used) * R + run) * 2 + inside
  const value = new Int32Array((total + 1) * K * R * 2).fill(UNREACHABLE)
  const parent = new Int32Array(value.length).fill(-1)
  value[index(0, 0, 0, 0)] = 0
  for (let day = 0; day < total; day += 1) {
    const off = calendar[day].off
    for (let used = 0; used < K; used += 1) for (let run = 0; run < R; run += 1) for (let inside = 0; inside < 2; inside += 1) {
      const from = index(day, used, run, inside)
      const current = value[from]
      if (current === UNREACHABLE) continue
      const relax = (to: number, next: number) => { if (next > value[to]) { value[to] = next; parent[to] = from } }
      if (off) {
        if (inside) relax(index(day + 1, used, 0, 1), current + ATTACH_WEIGHT)
        else relax(index(day + 1, used, Math.min(FREE_RUN_CAP, run + 1), 0), current)
      } else {
        relax(index(day + 1, used, 0, 0), current)
        if (used + 1 < K) relax(index(day + 1, used + 1, 0, 1), current - LEAVE_COST + (inside ? 0 : run * ATTACH_WEIGHT - STRETCH_COST))
      }
    }
  }
  let best = UNREACHABLE, bestState = -1
  for (let used = 0; used < K; used += 1) for (let run = 0; run < R; run += 1) for (let inside = 0; inside < 2; inside += 1) {
    const state = index(total, used, run, inside)
    if (value[state] > best) { best = value[state]; bestState = state }
  }
  const usedOf = (state: number) => Math.floor(state / (R * 2)) % K
  const leave: string[] = []
  let state = bestState
  for (let day = total; day > 0; day -= 1) {
    const previous = parent[state]
    if (usedOf(state) === usedOf(previous) + 1) leave.push(calendar[day - 1].iso)
    state = previous
  }
  return leave.reverse()
}

/** The longest run of days that needs at most `budget` working days as leave; ties prefer fewer leave days, then the earlier run. */
function longestWindow(calendar: readonly CalendarDay[], budget: number): { start: number; end: number; cost: number } | null {
  let best: { start: number; end: number; cost: number } | null = null
  let cost = 0, start = 0
  for (let end = 0; end < calendar.length; end += 1) {
    if (!calendar[end].off) cost += 1
    while (cost > budget && start <= end) { if (!calendar[start].off) cost -= 1; start += 1 }
    if (start > end) continue
    const length = end - start + 1
    if (!best || length > best.end - best.start + 1 || (length === best.end - best.start + 1 && cost < best.cost)) best = { start, end, cost }
  }
  return best
}

export function planLeave(calendar: readonly CalendarDay[], budget: number, strategy: Strategy = 'total'): LeavePlan {
  const days = Math.min(MAX_LEAVE_DAYS, Math.max(0, Math.floor(Number.isFinite(budget) ? budget : 0)))
  let leave = new Set<string>()
  if (strategy === 'longest' && days > 0) {
    const window = longestWindow(calendar, days)
    if (window) for (let day = window.start; day <= window.end; day += 1) if (!calendar[day].off) leave.add(calendar[day].iso)
    const remaining = days - leave.size
    if (remaining > 0) {
      // Everything inside the long break already counts as off; the leftover days bridge elsewhere.
      const rest = calendar.map((day, position) => (window && position >= window.start && position <= window.end ? { ...day, off: true } : day))
      for (const iso of bestBridges(rest, remaining)) leave.add(iso)
    }
  } else if (days > 0) {
    leave = new Set(bestBridges(calendar, days))
  }
  return summarise(calendar, spreadLongWeekends(calendar, leave), strategy, days)
}

/**
 * Plain long weekends (one leave day, no holiday) are interchangeable for the optimiser, so it would otherwise
 * pick arbitrary Fridays. This re-places them: holiday-adjacent days first, then spread evenly over the period.
 * The total stays optimal because every replacement attaches at least as many free days as the day it replaces.
 */
function spreadLongWeekends(calendar: readonly CalendarDay[], leave: ReadonlySet<string>): Set<string> {
  const floating = summarise(calendar, leave, 'total', 0).stretches.filter((stretch) => stretch.leaveDays.length === 1 && stretch.holidayDays === 0)
  if (floating.length === 0 || calendar.length === 0) return new Set(leave)
  const attachValue = Math.max(...floating.map((stretch) => stretch.length - 1))
  const base = new Set([...leave].filter((iso) => !floating.some((stretch) => stretch.leaveDays[0] === iso)))
  const occupied = new Set(summarise(calendar, base, 'total', 0).stretches.flatMap((stretch) => { const days: string[] = []; for (let iso = stretch.start; iso <= stretch.end; iso = addDays(iso, 1)) days.push(iso); return days }))
  const candidates: Array<{ position: number; iso: string; attach: number; holidays: number; attached: number[] }> = []
  calendar.forEach((day, position) => {
    if (day.off || base.has(day.iso)) return
    let holidays = 0, blocked = false
    const attached: number[] = []
    for (let before = position - 1; before >= 0 && calendar[before].off; before -= 1) { if (occupied.has(calendar[before].iso)) blocked = true; attached.push(before); holidays += calendar[before].holidays.length ? 1 : 0 }
    for (let after = position + 1; after < calendar.length && calendar[after].off; after += 1) { if (occupied.has(calendar[after].iso)) blocked = true; attached.push(after); holidays += calendar[after].holidays.length ? 1 : 0 }
    if (!blocked && attached.length >= attachValue && attached.length > 0) candidates.push({ position, iso: day.iso, attach: attached.length, holidays, attached })
  })
  const chosen: typeof candidates = []
  const claimed = new Set<number>()
  // A candidate may not touch a chosen day or share its weekend with one, or two leave days would capture the same free days.
  const free = (candidate: (typeof candidates)[number]) => !chosen.some((taken) => Math.abs(taken.position - candidate.position) <= 1) && candidate.attached.every((position) => !claimed.has(position))
  const take = (candidate: (typeof candidates)[number]) => { chosen.push(candidate); candidate.attached.forEach((position) => claimed.add(position)) }
  for (const candidate of [...candidates].filter((candidate) => candidate.holidays > 0).sort((a, b) => b.holidays - a.holidays || b.attach - a.attach || a.position - b.position)) {
    if (chosen.length < floating.length && free(candidate)) take(candidate)
  }
  const slots = floating.length - chosen.length
  for (let slot = 0; slot < slots; slot += 1) {
    const target = ((slot + 0.5) * calendar.length) / slots
    const nearest = candidates.filter((candidate) => !chosen.includes(candidate) && free(candidate)).sort((a, b) => Math.abs(a.position - target) - Math.abs(b.position - target) || a.position - b.position)[0]
    if (nearest) take(nearest)
  }
  // Fall back to the optimiser's own picks when spreading cannot place every day.
  const leftovers = floating.length - chosen.length
  const fallback = leftovers > 0 ? floating.map((stretch) => stretch.leaveDays[0]).filter((iso) => !chosen.some((candidate) => candidate.iso === iso)).slice(0, leftovers) : []
  return new Set([...base, ...chosen.map((candidate) => candidate.iso), ...fallback])
}

function summarise(calendar: readonly CalendarDay[], leave: ReadonlySet<string>, strategy: Strategy, budget: number): LeavePlan {
  const stretches: Stretch[] = []
  let current: CalendarDay[] = []
  const flush = () => {
    const leaveDays = current.filter((day) => leave.has(day.iso)).map((day) => day.iso)
    if (current.length && leaveDays.length) {
      const holidays = current.flatMap((day) => day.holidays)
      stretches.push({ start: current[0].iso, end: current[current.length - 1].iso, length: current.length, leaveDays, weekendDays: current.filter((day) => day.weekend && day.holidays.length === 0).length, holidayDays: current.filter((day) => day.holidays.length > 0).length, holidays })
    }
    current = []
  }
  for (const day of calendar) { if (day.off || leave.has(day.iso)) current.push(day); else flush() }
  flush()
  const leaveDays = [...leave].sort()
  const totalOffDays = stretches.reduce((sum, stretch) => sum + stretch.length, 0)
  const longest = stretches.reduce<Stretch | null>((best, stretch) => (best && best.length >= stretch.length ? best : stretch), null)
  return { strategy, budget, leaveDays, leaveUsed: leaveDays.length, leaveLeft: budget - leaveDays.length, stretches, totalOffDays, attachedFreeDays: totalOffDays - leaveDays.length, longest, ratio: leaveDays.length ? totalOffDays / leaveDays.length : null }
}

/** Public holidays that fall on weekly days off and therefore add no free day. */
export function holidaysOnWeekends(calendar: readonly CalendarDay[]): HolidayEntry[] {
  return calendar.filter((day) => day.weekend && day.holidays.length > 0).flatMap((day) => day.holidays)
}
