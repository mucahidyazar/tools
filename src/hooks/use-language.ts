'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Language } from '@/lib/format'

export type { Language }
export const LANGUAGE_EVENT = 'tools:language'
export const LANGUAGE_STORAGE_KEY = 'tools:language'
export const LANGUAGES: readonly Language[] = ['tr', 'en', 'ru']
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = { tr: 'Türkçe', en: 'English', ru: 'Русский' }

export function isLanguage(value: unknown): value is Language {
  return value === 'tr' || value === 'en' || value === 'ru'
}

export function readDocumentLanguage(): Language {
  const value = typeof document !== 'undefined' ? document.documentElement.lang : 'tr'
  return isLanguage(value) ? value : 'tr'
}

/** Applies a language to the document, remembers it for the next visit and notifies every listener. */
export function applyLanguage(next: Language) {
  document.documentElement.lang = next
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next) } catch { /* Storage is optional. */ }
  window.dispatchEvent(new CustomEvent<Language>(LANGUAGE_EVENT, { detail: next }))
}

/** The active UI language. Server output is always Turkish; the browser value is applied after hydration. */
export function useLanguage(): Language {
  const [language, setLanguage] = useState<Language>('tr')
  useEffect(() => {
    setLanguage(readDocumentLanguage())
    const listener = (event: Event) => { const value = (event as CustomEvent<Language>).detail; setLanguage(isLanguage(value) ? value : 'tr') }
    window.addEventListener(LANGUAGE_EVENT, listener)
    return () => window.removeEventListener(LANGUAGE_EVENT, listener)
  }, [])
  return language
}

/** Convenience wrapper: `t('Türkçe', 'English', 'Русский')` picks the active language; Russian falls back to English. */
export function useTranslation() {
  const language = useLanguage()
  const t = useCallback((turkish: string, english: string, russian?: string) => (language === 'tr' ? turkish : language === 'ru' ? russian ?? english : english), [language])
  return { language, tr: language === 'tr', t }
}
