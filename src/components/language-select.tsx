'use client'
import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown, Languages } from 'lucide-react'
import { applyLanguage, isLanguage, LANGUAGE_NAMES, LANGUAGES, useLanguage } from '@/hooks/use-language'

const ariaLabels = { tr: 'Dil seçin', en: 'Choose language', ru: 'Выберите язык' } as const

/** Language picker shared by the header and footer; the trigger matches the header's pill buttons. */
export function LanguageSelect({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const language = useLanguage()
  const trigger = size === 'md'
    ? 'focus-ring inline-flex h-10 items-center gap-2 rounded-full border border-[#e3e8f2] bg-white/70 pl-3.5 pr-3 text-[.7rem] font-semibold text-[#293653] shadow-[0_2px_8px_rgba(37,61,107,.04)] transition hover:border-[#ccd6ec] hover:bg-white'
    : 'focus-ring inline-flex h-9 items-center gap-2 rounded-lg border border-[#e3e8f2] bg-white pl-3 pr-2.5 text-[.68rem] font-semibold text-[#3f4c68] transition hover:border-[#ccd6ec]'
  return <Select.Root value={language} onValueChange={(value) => { if (isLanguage(value)) applyLanguage(value) }}>
    <Select.Trigger aria-label={ariaLabels[language]} className={trigger}><Languages className="size-4 shrink-0 text-[#5b6a8c]" strokeWidth={1.8} aria-hidden="true" /><span>{LANGUAGE_NAMES[language]}</span><Select.Icon><ChevronDown className="size-3.5 text-[#8792a6]" aria-hidden="true" /></Select.Icon></Select.Trigger>
    <Select.Portal><Select.Content position="popper" sideOffset={6} align="end" className="z-[100] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-[#e1e7f0] bg-white p-1 shadow-[0_12px_28px_rgba(31,53,98,.15)]"><Select.Viewport>{LANGUAGES.map((code) => <Select.Item key={code} value={code} className="relative flex h-9 cursor-pointer select-none items-center rounded-lg pl-8 pr-4 text-[.72rem] text-[#33415f] outline-none data-[highlighted]:bg-[#eef2ff] data-[highlighted]:text-[#2e55b8]"><Select.ItemText>{LANGUAGE_NAMES[code]}</Select.ItemText><Select.ItemIndicator className="absolute left-2.5"><Check className="size-3.5" aria-hidden="true" /></Select.ItemIndicator></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal>
  </Select.Root>
}
