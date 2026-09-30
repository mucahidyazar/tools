'use client'

import { History, RotateCcw, Trash2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage, type Language } from '@/hooks/use-language'
import { localeFor } from '@/lib/format'
import { addHistoryEntry, HISTORY_LIMIT, historySignature, historyStorageKey, isBlankSnapshot, readHistory, removeHistoryEntry, writeHistory, type HistoryValue, type HistoryValues, type ToolHistoryEntry } from '@/lib/tool-history'

export type { HistoryValue, ToolHistoryEntry }
/** Turns a stored value into a short human summary; `null` hides the field from the summary. */
export type HistoryFormatter = (value: HistoryValue, language: Language) => string | null
type FieldHandle = { readonly label: string; readonly value: HistoryValue; readonly format?: HistoryFormatter; set: (value: HistoryValue) => void }
type HistoryContextValue = {
  entries: ToolHistoryEntry[]
  register: (name: string, handle: FieldHandle) => () => void
  changed: () => void
  remove: (id: string) => void
  clear: () => void
  restore: (entry: ToolHistoryEntry) => void
  describe: (entry: ToolHistoryEntry, language: Language) => string
}

const SAVE_DELAY_MS = 1200
const SUMMARY_PARTS = 3
const SUMMARY_VALUE_LENGTH = 40
const HistoryContext = createContext<HistoryContextValue | null>(null)

function browserStorage() {
  try { return window.localStorage } catch { return undefined }
}

function truncate(value: string) {
  return value.length > SUMMARY_VALUE_LENGTH ? `${value.slice(0, SUMMARY_VALUE_LENGTH - 1)}…` : value
}

/** Summaries use the live field labels, so they follow the active language even for old records. */
function describeEntry(entry: ToolHistoryEntry, fields: Map<string, FieldHandle>, language: Language) {
  const registered = [...fields.keys()].filter((name) => name in entry.values)
  const unknown = Object.keys(entry.values).filter((name) => !fields.has(name))
  const parts: string[] = []
  for (const name of [...registered, ...unknown]) {
    const value = entry.values[name]
    const field = fields.get(name)
    let text: string | null
    if (field?.format) text = field.format(value, language)
    else if (typeof value === 'boolean') text = value ? field?.label ?? name : null
    else text = `${field?.label ?? name}: ${truncate(String(value))}`
    if (text) parts.push(text)
    if (parts.length === SUMMARY_PARTS) break
  }
  return parts.join(' · ')
}

/** Owns the per-tool history: registered fields, the persisted list and every mutation of it. */
export function ToolHistoryProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const fields = useRef(new Map<string, FieldHandle>())
  const entriesRef = useRef<ToolHistoryEntry[]>([])
  const [entries, setEntries] = useState<ToolHistoryEntry[]>([])
  const timer = useRef<number | undefined>(undefined)
  const lastSignature = useRef('')

  const commit = useCallback((next: ToolHistoryEntry[]) => {
    entriesRef.current = next
    setEntries(next)
    writeHistory(browserStorage(), slug, next)
  }, [slug])
  const load = useCallback(() => {
    const next = readHistory(browserStorage(), slug)
    entriesRef.current = next
    setEntries(next)
  }, [slug])

  useEffect(() => {
    load()
    const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === historyStorageKey(slug)) load() }
    window.addEventListener('storage', onStorage)
    return () => { window.clearTimeout(timer.current); window.removeEventListener('storage', onStorage) }
  }, [slug, load])

  const register = useCallback((name: string, handle: FieldHandle) => {
    fields.current.set(name, handle)
    return () => { if (fields.current.get(name) === handle) fields.current.delete(name) }
  }, [])
  const save = useCallback(() => {
    const values: HistoryValues = Object.fromEntries([...fields.current].map(([name, field]) => [name, field.value]))
    if (Object.keys(values).length === 0 || isBlankSnapshot(values)) return
    const signature = historySignature(values)
    if (signature === lastSignature.current) return
    lastSignature.current = signature
    commit(addHistoryEntry(entriesRef.current, values))
  }, [commit])
  const changed = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(save, SAVE_DELAY_MS)
  }, [save])
  const remove = useCallback((id: string) => { lastSignature.current = ''; commit(removeHistoryEntry(entriesRef.current, id)) }, [commit])
  const clear = useCallback(() => { lastSignature.current = ''; commit([]) }, [commit])
  const restore = useCallback((entry: ToolHistoryEntry) => {
    window.clearTimeout(timer.current)
    lastSignature.current = historySignature(entry.values)
    for (const [name, value] of Object.entries(entry.values)) fields.current.get(name)?.set(value)
  }, [])
  const describe = useCallback((entry: ToolHistoryEntry, language: Language) => describeEntry(entry, fields.current, language), [])

  const context = useMemo<HistoryContextValue>(() => ({ entries, register, changed, remove, clear, restore, describe }), [entries, register, changed, remove, clear, restore, describe])
  return <HistoryContext.Provider value={context}>{children}</HistoryContext.Provider>
}

export type HistoryFieldOptions = {
  /** Stable, language-independent identifier stored in the record. Without a name nothing is recorded. */
  name?: string
  /** Human label used in summaries; may change with the UI language. */
  label: string
  value: HistoryValue
  onRestore: (value: HistoryValue) => void
  format?: HistoryFormatter
}

/** Registers one input with the surrounding history provider. Works as a no-op outside a provider. */
export function useToolHistoryField({ name, label, value, onRestore, format }: HistoryFieldOptions) {
  const context = useContext(HistoryContext)
  const register = context?.register
  const changed = context?.changed
  const latest = useRef({ label, value, onRestore, format })
  const previous = useRef(value)
  useEffect(() => { latest.current = { label, value, onRestore, format } }, [label, value, onRestore, format])
  useEffect(() => {
    if (!register || !name) return
    return register(name, {
      get label() { return latest.current.label },
      get value() { return latest.current.value },
      get format() { return latest.current.format },
      set: (next) => latest.current.onRestore(next),
    })
  }, [register, name])
  useEffect(() => {
    if (Object.is(previous.current, value)) return
    previous.current = value
    if (name) changed?.()
  }, [value, changed, name])
}

export function useToolHistory() {
  return useContext(HistoryContext)
}

function formatTimestamp(timestamp: number, language: Language) {
  return new Intl.DateTimeFormat(localeFor(language), { dateStyle: 'short', timeStyle: 'short' }).format(timestamp)
}

export function ToolHistoryPanel() {
  const history = useToolHistory()
  const language = useLanguage()
  const pick = (tr: string, en: string, ru: string) => (language === 'tr' ? tr : language === 'ru' ? ru : en)
  const [open, setOpen] = useState(false)
  if (!history) return null
  const { entries } = history
  return <section className="tool-history" aria-label={pick('Araç geçmişi', 'Tool history', 'История инструмента')}>
    <div className="tool-history-heading">
      <button type="button" className="history-toggle focus-ring" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="tool-history-list"><History size={16} /><span>{pick('Son sorgular', 'Recent queries', 'Недавние запросы')}</span><small>{entries.length}/{HISTORY_LIMIT}</small></button>
      {entries.length > 0 && <button type="button" className="history-clear focus-ring" onClick={history.clear}><Trash2 size={13} />{pick('Tümünü sil', 'Clear all', 'Очистить всё')}</button>}
    </div>
    {open && <div id="tool-history-list" className="history-list">
      {entries.length === 0
        ? <p className="history-empty">{pick('Henüz kaydedilmiş sorgu yok. Bir değeri değiştirdiğinde sorgu otomatik kaydedilir.', 'No saved query yet. A query is saved automatically when you change a value.', 'Пока нет сохранённых запросов. Запрос сохраняется автоматически при изменении значения.')}</p>
        : entries.map((entry) => <div className="history-item" key={entry.id}>
          <button type="button" className="history-restore focus-ring" onClick={() => { history.restore(entry); setOpen(false) }} aria-label={pick('Bu sorguyu geri yükle', 'Restore this query', 'Восстановить этот запрос')}><RotateCcw size={14} /><span><strong>{history.describe(entry, language) || '—'}</strong><small>{formatTimestamp(entry.createdAt, language)}</small></span></button>
          <button type="button" className="history-delete focus-ring" onClick={() => history.remove(entry.id)} aria-label={pick('Kaydı sil', 'Delete record', 'Удалить запись')}><X size={14} /></button>
        </div>)}
    </div>}
    <p className="history-note">{pick(`Son ${HISTORY_LIMIT} sorgu yalnızca bu tarayıcıda saklanır; üretilen şifreler asla kaydedilmez.`, `The last ${HISTORY_LIMIT} queries stay in this browser only; generated passwords are never stored.`, `Последние ${HISTORY_LIMIT} запросов хранятся только в этом браузере; сгенерированные пароли никогда не сохраняются.`)}</p>
  </section>
}
