/** Pure, storage-agnostic helpers behind the per-tool "recent queries" feature. */
export const HISTORY_LIMIT = 10
export const HISTORY_STORAGE_VERSION = 2

export type HistoryValue = string | number | boolean
export type HistoryValues = Record<string, HistoryValue>
export type ToolHistoryEntry = { id: string; createdAt: number; values: HistoryValues }
export type HistoryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const historyStorageKey = (slug: string) => `tools:history:v${HISTORY_STORAGE_VERSION}:${slug}`

function isHistoryValue(value: unknown): value is HistoryValue {
  if (typeof value === 'number') return Number.isFinite(value)
  return typeof value === 'string' || typeof value === 'boolean'
}

/** Keeps only primitive, finite values keyed by non-empty field names. */
export function normalizeHistoryValues(values: unknown): HistoryValues | null {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return null
  const entries = Object.entries(values).filter(([key, value]) => key.length > 0 && isHistoryValue(value))
  return entries.length > 0 ? Object.fromEntries(entries) : null
}

/** Validates untrusted storage content; malformed, duplicate and surplus records are dropped. */
export function normalizeHistoryEntries(value: unknown): ToolHistoryEntry[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const entries: ToolHistoryEntry[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const { id, createdAt, values } = item as Record<string, unknown>
    const normalized = normalizeHistoryValues(values)
    if (typeof id !== 'string' || id.length === 0 || typeof createdAt !== 'number' || !Number.isFinite(createdAt) || !normalized || seen.has(id)) continue
    seen.add(id)
    entries.push({ id, createdAt, values: normalized })
    if (entries.length === HISTORY_LIMIT) break
  }
  return entries
}

/** Order-independent identity of a snapshot, so re-registered fields never create duplicates. */
export function historySignature(values: HistoryValues) {
  return JSON.stringify(Object.keys(values).sort().map((key) => [key, values[key]]))
}

export function isBlankSnapshot(values: HistoryValues) {
  return Object.values(values).every((value) => value === '' || value === false)
}

export function createHistoryId(createdAt = Date.now(), random = Math.random()) {
  return `${createdAt.toString(36)}-${random.toString(36).slice(2, 8)}`
}

/** Returns a new list with the snapshot first, older duplicates removed and the limit applied. */
export function addHistoryEntry(entries: readonly ToolHistoryEntry[], values: HistoryValues, createdAt = Date.now(), id = createHistoryId(createdAt)): ToolHistoryEntry[] {
  const signature = historySignature(values)
  return [{ id, createdAt, values: { ...values } }, ...entries.filter((entry) => historySignature(entry.values) !== signature)].slice(0, HISTORY_LIMIT)
}

export function removeHistoryEntry(entries: readonly ToolHistoryEntry[], id: string): ToolHistoryEntry[] {
  return entries.filter((entry) => entry.id !== id)
}

export function readHistory(storage: HistoryStorage | undefined, slug: string): ToolHistoryEntry[] {
  try {
    return normalizeHistoryEntries(JSON.parse(storage?.getItem(historyStorageKey(slug)) ?? '[]'))
  } catch {
    return []
  }
}

/** Persists the list; an empty list removes the key. Returns false when storage is unavailable. */
export function writeHistory(storage: HistoryStorage | undefined, slug: string, entries: readonly ToolHistoryEntry[]) {
  try {
    if (!storage) return false
    if (entries.length === 0) storage.removeItem(historyStorageKey(slug))
    else storage.setItem(historyStorageKey(slug), JSON.stringify(entries.slice(0, HISTORY_LIMIT)))
    return true
  } catch {
    return false
  }
}

/** A minimal in-memory Storage, used by tests and as a fallback when localStorage throws. */
export function createMemoryStorage(): HistoryStorage {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, String(value)) },
    removeItem: (key) => { map.delete(key) },
  }
}
