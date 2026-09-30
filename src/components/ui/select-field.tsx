'use client'
import * as Popover from '@radix-ui/react-popover'
import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { cn } from '@/lib/utils'

export type SelectOption = { value: string; label: string }
type Props = { label?: string; ariaLabel?: string; value: string; onChange: (value: string) => void; options: SelectOption[]; className?: string; searchable?: boolean }

/** Lists longer than this switch to a searchable combobox so long year lists stay usable. */
const SEARCH_THRESHOLD = 12
const triggerClass = 'focus-ring flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#dfe6f0] bg-white px-3.5 text-left text-[.84rem] text-[#1a2948] shadow-sm outline-none data-[placeholder]:text-[#9ba6b7]'
const contentClass = 'z-[100] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-[#e1e7f0] bg-white p-1 shadow-[0_12px_28px_rgba(31,53,98,.15)]'

function normalize(text: string, language: 'tr' | 'en' | 'ru') {
  return text.toLocaleLowerCase(language).normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function SearchableSelect({ label, ariaLabel, value, onChange, options, className }: Props) {
  const language = useLanguage()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const selected = options.find((option) => option.value === value)
  const filtered = useMemo(() => { const needle = normalize(query.trim(), language); return needle ? options.filter((option) => normalize(option.label, language).includes(needle)) : options }, [options, query, language])
  useEffect(() => { if (open) { setQuery(''); setActive(Math.max(0, options.findIndex((option) => option.value === value))) } }, [open, options, value])
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }) }, [active, filtered])
  const choose = (option: SelectOption) => { onChange(option.value); setOpen(false) }
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(filtered.length - 1, index + 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(0, index - 1)) }
    else if (event.key === 'Home') { event.preventDefault(); setActive(0) }
    else if (event.key === 'End') { event.preventDefault(); setActive(filtered.length - 1) }
    else if (event.key === 'Enter') { event.preventDefault(); if (filtered[active]) choose(filtered[active]) }
  }
  return <div className={cn('space-y-1', className)}>{label && <label id={`${id}-label`} className="block text-[.76rem] font-semibold text-[#52607b]">{label}</label>}<Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger asChild><button type="button" role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-controls={`${id}-list`} aria-label={ariaLabel ?? label} className={triggerClass}><span className="truncate">{selected?.label ?? '—'}</span><ChevronDown className="size-4 shrink-0 text-[#8792a6]" /></button></Popover.Trigger><Popover.Portal><Popover.Content align="start" sideOffset={5} onOpenAutoFocus={(event) => { event.preventDefault(); (event.currentTarget as HTMLElement | null)?.querySelector('input')?.focus() }} className={cn(contentClass, 'w-[var(--radix-popover-trigger-width)] min-w-[220px]')}><div className="flex items-center gap-2 border-b border-[#eef1f6] px-2 pb-1.5 pt-1"><Search className="size-3.5 text-[#8792a6]" /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setActive(0) }} onKeyDown={onKeyDown} placeholder={language === 'en' ? 'Search…' : language === 'ru' ? 'Поиск…' : 'Ara…'} aria-label={language === 'en' ? 'Search options' : language === 'ru' ? 'Поиск по вариантам' : 'Seçeneklerde ara'} aria-controls={`${id}-list`} aria-activedescendant={filtered[active] ? `${id}-option-${active}` : undefined} className="h-8 w-full bg-transparent text-[.78rem] text-[#1a2948] outline-none placeholder:text-[#9ba6b7]" autoComplete="off" /></div><ul ref={listRef} id={`${id}-list`} role="listbox" aria-labelledby={label ? `${id}-label` : undefined} className="max-h-[min(280px,calc(var(--radix-popover-content-available-height)-64px))] overflow-y-auto py-1">{filtered.length === 0 && <li className="px-3 py-2 text-[.78rem] text-[#8b97ab]">{language === 'en' ? 'No match' : language === 'ru' ? 'Нет совпадений' : 'Sonuç yok'}</li>}{filtered.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} data-index={index} role="option" aria-selected={option.value === value} onMouseEnter={() => setActive(index)} onClick={() => choose(option)} className={cn('relative flex h-9 cursor-pointer select-none items-center rounded-lg px-8 text-[.78rem] text-[#33415f]', index === active && 'bg-[#eef2ff] text-[#2e55b8]')}>{option.value === value && <Check className="absolute left-2 size-3.5" />}<span className="truncate">{option.label}</span></li>)}</ul></Popover.Content></Popover.Portal></Popover.Root></div>
}

export function SelectField(props: Props) {
  const { label, ariaLabel, value, onChange, options, className, searchable } = props
  if (searchable || options.length > SEARCH_THRESHOLD) return <SearchableSelect {...props} />
  const selectedLabel = options.find((option) => option.value === value)?.label
  // Radix mirrors the value into a hidden native <select> for form autofill and echoes that element's value back
  // through onValueChange. When the value is changed programmatically (URL pre-fill, history restore) before the
  // items have registered their native options, the echo is '' and would wipe the state, so only known values pass.
  const handleValueChange = (next: string) => { if (options.some((option) => option.value === next)) onChange(next) }
  return <div className={cn('space-y-1', className)}>{label && <label className="block text-[.76rem] font-semibold text-[#52607b]">{label}</label>}<Select.Root value={value} onValueChange={handleValueChange}><Select.Trigger aria-label={ariaLabel ?? label} className={triggerClass}><span className="truncate">{selectedLabel ?? <Select.Value placeholder="" />}</span><Select.Icon><ChevronDown className="size-4 text-[#8792a6]" /></Select.Icon></Select.Trigger><Select.Portal><Select.Content position="popper" sideOffset={5} className={cn(contentClass, 'max-h-[min(320px,var(--radix-select-content-available-height))]')}><Select.Viewport className="max-h-[inherit] overflow-y-auto">{options.map((option) => <Select.Item key={option.value} value={option.value} className="relative flex h-9 cursor-pointer select-none items-center rounded-lg px-8 text-[.78rem] text-[#33415f] outline-none data-[highlighted]:bg-[#eef2ff] data-[highlighted]:text-[#2e55b8]"><Select.ItemText>{option.label}</Select.ItemText><Select.ItemIndicator className="absolute left-2"><Check className="size-3.5" /></Select.ItemIndicator></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal></Select.Root></div>
}
