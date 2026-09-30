'use client'
import { useEffect, useId, useState } from 'react'
import { useToolHistoryField } from '@/components/tool-history'
import { SelectField } from '@/components/ui/select-field'
import { useLanguage } from '@/hooks/use-language'
import { formatDate, monthName, todayIso } from '@/lib/format'

type Parts = { day: string; month: string; year: string }
const inputClass = 'focus-ring h-11 w-full rounded-xl border border-[#dfe6f0] bg-white px-3 text-center text-[.84rem] tabular-nums text-[#1a2948] shadow-sm outline-none transition placeholder:text-[#b1bccd] focus:border-[#7899e8]'

function split(value: string): Parts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? { day: String(Number(match[3])), month: String(Number(match[2])), year: match[1] } : { day: '', month: '', year: '' }
}

/** Returns an ISO date when the parts form a real calendar date inside the allowed years. */
export function joinDateParts({ day, month, year }: Parts, minYear: number, maxYear: number) {
  const d = Number(day), m = Number(month), y = Number(year)
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y) || year.length !== 4) return ''
  if (y < minYear || y > maxYear || m < 1 || m > 12 || d < 1) return ''
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return ''
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Day / month / year entry. Typing a full date is faster than paging a calendar back to a birth
 * year, and every part validates against the real calendar (leap days included).
 */
export function DateField({ name, label, value, onChange, minYear = 1900, maxYear = new Date().getFullYear() + 1, todayButton = false }: { name: string; label: string; value: string; onChange: (value: string) => void; minYear?: number; maxYear?: number; todayButton?: boolean }) {
  const language = useLanguage()
  const id = useId()
  const [parts, setParts] = useState<Parts>(() => split(value))
  useEffect(() => { if (value !== joinDateParts(parts, minYear, maxYear)) setParts(split(value)) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  useToolHistoryField({ name, label, value, onRestore: (next) => onChange(String(next)), format: (next, lang) => `${label}: ${formatDate(String(next), lang, { day: 'numeric', month: 'short', year: 'numeric' })}` })
  const update = (patch: Partial<Parts>) => {
    const next = { ...parts, ...patch }
    setParts(next)
    onChange(joinDateParts(next, minYear, maxYear))
  }
  const complete = parts.day !== '' && parts.month !== '' && parts.year.length === 4
  const invalid = complete && joinDateParts(parts, minYear, maxYear) === ''
  const en = language === 'en'
  const ru = language === 'ru'
  return <fieldset className="min-w-0 space-y-1" aria-describedby={invalid ? `${id}-error` : undefined}>
    <legend className="flex w-full items-center justify-between text-[.76rem] font-semibold text-[#52607b]"><span>{label}</span>{todayButton && <button type="button" onClick={() => onChange(todayIso())} className="focus-ring rounded-md px-1.5 py-0.5 text-[.66rem] font-bold text-[#4d6fd0] hover:bg-[#eef2ff]">{ru ? 'Сегодня' : en ? 'Today' : 'Bugün'}</button>}</legend>
    <div className="grid grid-cols-[4.2rem_minmax(0,1fr)_5.2rem] gap-2">
      <input aria-label={ru ? `${label}: день` : en ? `${label}: day` : `${label}: gün`} inputMode="numeric" pattern="[0-9]*" maxLength={2} placeholder={ru ? 'ДД' : en ? 'DD' : 'GG'} value={parts.day} onChange={(event) => update({ day: event.target.value.replace(/\D/g, '').slice(0, 2) })} className={inputClass} />
      <SelectField ariaLabel={ru ? `${label}: месяц` : en ? `${label}: month` : `${label}: ay`} value={parts.month} onChange={(month) => update({ month })} options={Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: monthName(index, language, 'long') }))} />
      <input aria-label={ru ? `${label}: год` : en ? `${label}: year` : `${label}: yıl`} inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder={ru ? 'ГГГГ' : 'YYYY'} value={parts.year} onChange={(event) => update({ year: event.target.value.replace(/\D/g, '').slice(0, 4) })} className={inputClass} />
    </div>
    {invalid && <p id={`${id}-error`} role="alert" className="text-[.68rem] font-semibold text-[#c64a57]">{ru ? `Введите реальную дату между ${minYear} и ${maxYear}.` : en ? `Enter a real date between ${minYear} and ${maxYear}.` : `${minYear}–${maxYear} arasında gerçek bir tarih girin.`}</p>}
  </fieldset>
}
