export type Language = 'tr' | 'en' | 'ru'

export const CURRENCY_SYMBOLS: Readonly<Record<string, string>> = { TRY: '₺', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: 'CN¥', INR: '₹', CHF: 'CHF ', CAD: 'CA$', AUD: 'A$' }

export function localeFor(language: Language) {
  return language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : 'tr-TR'
}

/** Locale-aware number output. Non-finite values render as a dash instead of "NaN". */
export function formatNumber(value: number, language: Language, options: Intl.NumberFormatOptions = {}) {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 2, ...options }).format(value)
}

export function formatPercent(value: number, language: Language, fractionDigits = 2) {
  if (!Number.isFinite(value)) return '—'
  const number = formatNumber(value, language, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
  return language === 'tr' ? `%${number}` : language === 'ru' ? `${number}\u00a0%` : `${number}%`
}

/** Formats an amount with a currency symbol or unit label. Unknown codes fall back to a suffix. */
export function formatMoney(value: number, language: Language, currency: string, fractionDigits = 0) {
  if (!Number.isFinite(value)) return '—'
  const number = formatNumber(value, language, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
  const symbol = CURRENCY_SYMBOLS[currency]
  if (symbol) return `${symbol}${number}`
  if (currency === 'GOLD') return `${number} ${language === 'tr' ? 'gr altın' : language === 'ru' ? 'г золота' : 'g gold'}`
  return `${number} ${currency}`
}

export function formatDate(iso: string, language: Language, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(localeFor(language), options).format(date)
}

/** Today's calendar date in the visitor's time zone, as YYYY-MM-DD. */
export function todayIso(now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function monthName(monthIndex: number, language: Language, style: 'short' | 'long' = 'short') {
  return new Intl.DateTimeFormat(localeFor(language), { month: style }).format(new Date(2024, monthIndex, 1))
}
