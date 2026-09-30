'use client'

import { ChevronDown, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useToolHistoryField, type HistoryFormatter } from '@/components/tool-history'
import { SelectField, type SelectOption } from '@/components/ui/select-field'
import type { Language } from '@/lib/format'

export const inputClass = 'focus-ring mt-1 h-11 w-full rounded-xl border border-[#dfe6f0] bg-white px-3.5 text-[.84rem] text-[#1a2948] shadow-sm outline-none transition placeholder:text-[#9ba6b7] focus:border-[#7899e8]'
export const labelClass = 'block text-[.76rem] font-semibold leading-[1.15rem] text-[#52607b]'

export function currencyOptions(language: Language): SelectOption[] {
  const pick = (tr: string, en: string, ru: string) => (language === 'tr' ? tr : language === 'ru' ? ru : en)
  return [
    { value: 'TRY', label: pick('Türk lirası (TRY)', 'Turkish lira (TRY)', 'Турецкая лира (TRY)') },
    { value: 'USD', label: pick('Amerikan doları (USD)', 'US dollar (USD)', 'Доллар США (USD)') },
    { value: 'EUR', label: pick('Euro (EUR)', 'Euro (EUR)', 'Евро (EUR)') },
    { value: 'GBP', label: pick('Sterlin (GBP)', 'Pound sterling (GBP)', 'Фунт стерлингов (GBP)') },
    { value: 'GOLD', label: pick('Gram altın', 'Gram gold', 'Золото (грамм)') },
  ]
}

type FieldProps = {
  name: string
  label: string
  /** Small text on the right of the label, e.g. a derived value; keeps rows aligned unlike a hint. */
  labelExtra?: React.ReactNode
  value: string | number
  onChange: (value: string) => void
  type?: string
  suffix?: string
  min?: string | number
  max?: string | number
  step?: string | number
  placeholder?: string
  hint?: string
  format?: HistoryFormatter
}

/** A labelled input registered with the tool history under a stable `name`. */
export function Field({ name, label, labelExtra, value, onChange, type = 'number', suffix, min, max, step = 'any', placeholder, hint, format }: FieldProps) {
  useToolHistoryField({ name, label, value, onRestore: (next) => onChange(String(next)), format })
  return <label className={labelClass}><span className="flex items-baseline justify-between gap-2"><span>{label}</span>{labelExtra && <span className="text-[.66rem] font-semibold text-[#7d99d7]">{labelExtra}</span>}</span><span className="relative block">{suffix && <span className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[.78rem] text-[#8490a6]">{suffix}</span>}<input type={type} inputMode={type === 'number' ? 'decimal' : undefined} value={value} min={min} max={max} step={step} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`${inputClass} ${suffix ? 'pr-14' : ''}`} /></span>{hint && <span className="mt-1 block text-[.68rem] font-normal text-[#8b97ab]">{hint}</span>}</label>
}

export function TextArea({ name, label, value, onChange, rows = 6, mono = false, placeholder, spellCheck = true }: { name: string; label: string; value: string; onChange: (value: string) => void; rows?: number; mono?: boolean; placeholder?: string; spellCheck?: boolean }) {
  useToolHistoryField({ name, label, value, onRestore: (next) => onChange(String(next)) })
  return <label className={labelClass}>{label}<textarea value={value} rows={rows} placeholder={placeholder} spellCheck={spellCheck} onChange={(event) => onChange(event.target.value)} className={`focus-ring mt-1 w-full resize-y rounded-xl border border-[#dfe6f0] bg-white p-3.5 text-[.84rem] text-[#1a2948] outline-none transition focus:border-[#7899e8] ${mono ? 'bg-[#fbfcfe] font-mono text-[.8rem] text-[#253a68]' : ''}`} /></label>
}

/** A select registered with the tool history; summaries show the option label rather than the raw value. */
export function Select({ name, label, value, onChange, options, className }: { name: string; label: string; value: string; onChange: (value: string) => void; options: SelectOption[]; className?: string }) {
  useToolHistoryField({ name, label, value, onRestore: (next) => onChange(String(next)), format: (next) => `${label}: ${options.find((option) => option.value === String(next))?.label ?? String(next)}` })
  return <SelectField label={label} value={value} onChange={onChange} options={options} className={className} />
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-[#e3e9f2] bg-white p-5 shadow-[0_10px_35px_rgba(43,70,125,.06)] sm:p-7 ${className}`}>{children}</div>
}

const tones = { default: 'text-[#2753b5]', positive: 'text-[#25865a]', negative: 'text-[#c94f5f]', neutral: 'text-[#273c67]' }
export type Tone = keyof typeof tones

export function Result({ label, value, detail, tone = 'default' }: { label: string; value: string; detail?: string; tone?: Tone }) {
  return <div className="rounded-2xl border border-[#dce7fb] bg-gradient-to-br from-[#f5f8ff] to-[#f2f8ff] p-5"><p className="text-[.72rem] font-semibold text-[#71809e]">{label}</p><p className={`mt-1 break-words font-display text-[clamp(1.4rem,3.4vw,2rem)] font-extrabold tracking-[-.04em] ${tones[tone]}`}>{value}</p>{detail && <p className="mt-1 text-[.75rem] leading-relaxed text-[#8290a8]">{detail}</p>}</div>
}

export function Stat({ label, value, tone = 'neutral', detail }: { label: string; value: string; tone?: Tone; detail?: string }) {
  return <div className="rounded-xl bg-[#f7f9fc] p-3"><p className="text-[.7rem] text-[#7e8aa1]">{label}</p><p className={`mt-1 break-words font-bold ${tones[tone]}`}>{value}</p>{detail && <p className="mt-0.5 text-[.66rem] text-[#94a0b4]">{detail}</p>}</div>
}

export function Submit({ children, onClick, type = 'button' }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit' }) {
  return <button type={type} onClick={onClick} className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#4d76df] px-5 text-[.78rem] font-bold text-white shadow-[0_7px_14px_rgba(74,115,222,.2)] transition hover:bg-[#3f66ca]">{children}</button>
}

export function QuietButton({ children, onClick, pressed, className = '' }: { children: React.ReactNode; onClick?: () => void; pressed?: boolean; className?: string }) {
  return <button type="button" onClick={onClick} aria-pressed={pressed} className={`focus-ring inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[.73rem] font-semibold text-[#566b93] transition hover:bg-[#e9effb] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}>{children}</button>
}

/** Expands or collapses a detail block, mirroring its state with aria-expanded. */
export function Disclosure({ open, onToggle, openLabel, closedLabel, controls }: { open: boolean; onToggle: () => void; openLabel: string; closedLabel: string; controls: string }) {
  return <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={controls} className="focus-ring mt-6 inline-flex items-center gap-2 text-[.8rem] font-bold text-[#496ac7]">{open ? openLabel : closedLabel}<ChevronDown className={`size-4 transition ${open ? 'rotate-180' : ''}`} /></button>
}

export function Note({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warning' }) {
  return <p className={`mt-5 flex items-start gap-2 rounded-xl px-3.5 py-3 text-[.72rem] leading-relaxed ${tone === 'warning' ? 'bg-[#fff8ec] text-[#8b6a34]' : 'bg-[#f6f8fd] text-[#748098]'}`}><Info className={`mt-0.5 size-4 shrink-0 ${tone === 'warning' ? 'text-[#d19a3c]' : 'text-[#6685db]'}`} /><span>{children}</span></p>
}

/** `footer` renders a highlighted totals row that stays visible while the body scrolls. */
export function DataTable({ id, headers, rows, footer, maxHeight = 'max-h-80', minWidth = 'min-w-[520px]' }: { id?: string; headers: string[]; rows: (string | number)[][]; footer?: (string | number)[]; maxHeight?: string; minWidth?: string }) {
  return <div id={id} className={`mt-4 ${maxHeight} overflow-auto rounded-xl border border-[#e7ecf3]`}><table className={`w-full ${minWidth} text-left text-[.74rem]`}><thead className="sticky top-0 z-[1] bg-[#f7f9fc] text-[#77839b]"><tr>{headers.map((header) => <th key={header} scope="col" className="px-4 py-3 font-semibold">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-[#eef1f6]">{row.map((cell, cellIndex) => <td key={cellIndex} className={`px-4 py-2.5 tabular-nums ${cellIndex === row.length - 1 ? 'font-semibold text-[#2a3d66]' : 'text-[#4a5975]'}`}>{cell}</td>)}</tr>)}</tbody>{footer && <tfoot className="sticky bottom-0 z-[1] bg-[#eef2fb] font-bold text-[#1c2846] shadow-[0_-1px_0_#dbe3f1]"><tr>{footer.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 tabular-nums">{cell}</td>)}</tr></tfoot>}</table></div>
}

/** Presentational tabs for switching between result views; they only change what is shown, so they stay out of the history. */
export function ResultTabs<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (value: T) => void; options: Array<{ value: T; label: string }> }) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const index = options.findIndex((option) => option.value === value)
    const next = options[(index + (event.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length]
    onChange(next.value)
    event.currentTarget.querySelector<HTMLElement>(`[data-value="${next.value}"]`)?.focus()
  }
  return <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="result-tabs">{options.map((option) => <button key={option.value} type="button" role="tab" data-value={option.value} aria-selected={value === option.value} tabIndex={value === option.value ? 0 : -1} onClick={() => onChange(option.value)} className="focus-ring">{option.label}</button>)}</div>
}

/** A horizontally scrollable strip of year chips with step arrows and a select for jumping straight to a year. */
export function YearStrip({ years, value, onChange, label, selectLabel, formatYear = String, language }: { years: number[]; value: number; onChange: (year: number) => void; label: string; selectLabel: string; formatYear?: (year: number) => string; language: Language }) {
  const stripRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const strip = stripRef.current
    const chip = strip?.querySelector<HTMLElement>(`[data-year="${value}"]`)
    if (!strip || !chip) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    strip.scrollTo({ left: chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2, behavior: reduced ? 'auto' : 'smooth' })
  }, [value])
  const index = years.indexOf(value)
  const step = (delta: number) => { const next = years[index + delta]; if (next !== undefined) onChange(next) }
  const arrowLabels = language === 'tr' ? ['Önceki yıl', 'Sonraki yıl'] : language === 'ru' ? ['Предыдущий год', 'Следующий год'] : ['Previous year', 'Next year']
  return <div className="year-strip-row">
    <button type="button" className="year-strip-arrow focus-ring" onClick={() => step(-1)} disabled={index <= 0} aria-label={arrowLabels[0]}><ChevronLeft className="size-4" aria-hidden="true" /></button>
    <div ref={stripRef} role="group" aria-label={label} className="year-strip">{years.map((year) => <button key={year} type="button" data-year={year} aria-pressed={year === value} onClick={() => onChange(year)} className="year-chip focus-ring">{formatYear(year)}</button>)}</div>
    <button type="button" className="year-strip-arrow focus-ring" onClick={() => step(1)} disabled={index < 0 || index >= years.length - 1} aria-label={arrowLabels[1]}><ChevronRight className="size-4" aria-hidden="true" /></button>
    <SelectField ariaLabel={selectLabel} value={String(value)} onChange={(next) => onChange(Number(next))} options={years.map((year) => ({ value: String(year), label: formatYear(year) }))} className="year-strip-select" />
  </div>
}

/** A stacked proportion bar with a legend, for principal/interest style splits. */
export function RatioBar({ parts, label }: { parts: Array<{ label: string; value: number; color: string; display: string }>; label: string }) {
  const total = parts.reduce((sum, part) => sum + Math.max(0, part.value), 0)
  return <div className="rounded-2xl bg-[#f8faff] p-4" role="img" aria-label={`${label}: ${parts.map((part) => `${part.label} ${part.display}`).join(', ')}`}>
    <p className="text-[.7rem] font-semibold text-[#74819a]">{label}</p>
    <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#e6ebf5]">{parts.map((part) => <span key={part.label} style={{ width: `${total > 0 ? (Math.max(0, part.value) / total) * 100 : 0}%`, background: part.color }} className="h-full transition-[width] duration-300" />)}</div>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[.7rem] text-[#6d7b95]">{parts.map((part) => <span key={part.label} className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: part.color }} /><b className="text-[#2f4470]">{part.display}</b> {part.label} {total > 0 && <span className="text-[#98a4b8]">({Math.round((Math.max(0, part.value) / total) * 100)}%)</span>}</span>)}</div>
  </div>
}

/** Segmented control for a small set of exclusive modes; same label + 44px height as every other field. */
export function Segmented<T extends string>({ name, label, value, onChange, options, hideLabel = false, className = '' }: { name: string; label: string; value: T; onChange: (value: T) => void; options: Array<{ value: T; label: string }>; hideLabel?: boolean; className?: string }) {
  useToolHistoryField({ name, label, value, onRestore: (next) => { const match = options.find((option) => option.value === String(next)); if (match) onChange(match.value) }, format: (next) => options.find((option) => option.value === String(next))?.label ?? null })
  return <div className={`space-y-1 ${className}`}>{!hideLabel && <span className={labelClass}>{label}</span>}<div role="group" aria-label={label} className={`flex h-11 gap-1 rounded-xl bg-[#f1f4fa] p-1 ${hideLabel ? '' : 'mt-1'}`}>{options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`focus-ring min-w-0 flex-1 truncate rounded-lg px-2 text-[.76rem] font-semibold whitespace-nowrap transition ${value === option.value ? 'bg-white text-[#365fbf] shadow-sm' : 'text-[#79869e] hover:text-[#3d5c8c]'}`}>{option.label}</button>)}</div></div>
}

/** Small uppercase heading that separates groups of fields inside a form. */
export function FormSection({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return <section className="form-section"><div className="form-section-head"><h3 className="eyebrow">{title}</h3>{aside}</div><div className="field-grid">{children}</div></section>
}
