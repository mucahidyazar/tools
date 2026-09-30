import { TOOL_PROMOTIONS, TOOL_RELEASE_DATES, type ToolPromotion } from './tool-promotions'

export type ToolSort = 'popular' | 'newest' | 'name-asc' | 'name-desc'
export const DEFAULT_TOOL_SORT: ToolSort = 'popular'
export const TOOL_SORTS: readonly ToolSort[] = ['popular', 'newest', 'name-asc', 'name-desc']
export type ToolUsageCounts = Record<string, number>
export type RankableTool = { slug: string; title: string; publishedAt?: string }
export const TOOL_USAGE_EVENT = 'tool-usage-updated'
export const PINNED_TOOLS_STORAGE_KEY = 'tools:pinned:v1'

function timestamp(value: Date | number) {
  return value instanceof Date ? value.getTime() : value
}

export function isToolSort(value: unknown): value is ToolSort {
  return typeof value === 'string' && (TOOL_SORTS as readonly string[]).includes(value)
}

export function getActivePromotion(
  slug: string,
  now: Date | number = Date.now(),
  promotions: readonly ToolPromotion[] = TOOL_PROMOTIONS,
) {
  const time = timestamp(now)
  return promotions
    .filter((promotion) => promotion.slug === slug && Date.parse(promotion.startsAt) <= time && time < Date.parse(promotion.endsAt))
    .sort((a, b) => b.priority - a.priority)[0]
}

export type SortOptions = {
  now?: Date | number
  language?: 'tr' | 'en' | 'ru'
  promotions?: readonly ToolPromotion[]
  /** Slugs the visitor pinned, in display order. Pinned tools ignore the selected sort. */
  pinned?: readonly string[]
}

/**
 * Returns a new array in three bands: active promotions (by priority), the visitor's pins (in pin
 * order), then everything else in the selected order. Ties keep the input order.
 */
export function sortTools<T extends RankableTool>(
  items: readonly T[],
  counts: Readonly<ToolUsageCounts>,
  sort: ToolSort = DEFAULT_TOOL_SORT,
  options: SortOptions = {},
): T[] {
  const { now = Date.now(), language = 'tr', promotions = TOOL_PROMOTIONS, pinned = [] } = options
  const collator = new Intl.Collator(language, { sensitivity: 'base', numeric: true })
  const count = (slug: string) => (Number.isSafeInteger(counts[slug]) && counts[slug] >= 0 ? counts[slug] : 0)
  const published = (item: T) => Date.parse(item.publishedAt ?? TOOL_RELEASE_DATES[item.slug] ?? '') || 0
  const pinIndex = (slug: string) => { const index = pinned.indexOf(slug); return index === -1 ? Number.POSITIVE_INFINITY : index }

  return items.map((item, index) => ({ item, index, promotion: getActivePromotion(item.slug, now, promotions), pin: pinIndex(item.slug) }))
    .sort((a, b) => {
      if (a.promotion && !b.promotion) return -1
      if (b.promotion && !a.promotion) return 1
      if (a.promotion && b.promotion) {
        return b.promotion.priority - a.promotion.priority || promotions.indexOf(a.promotion) - promotions.indexOf(b.promotion) || a.index - b.index
      }
      const aPinned = Number.isFinite(a.pin), bPinned = Number.isFinite(b.pin)
      if (aPinned && !bPinned) return -1
      if (bPinned && !aPinned) return 1
      if (aPinned && bPinned) return a.pin - b.pin || a.index - b.index
      let difference = 0
      if (sort === 'popular') difference = count(b.item.slug) - count(a.item.slug)
      if (sort === 'newest') difference = published(b.item) - published(a.item)
      if (sort === 'name-asc') difference = collator.compare(a.item.title, b.item.title)
      if (sort === 'name-desc') difference = collator.compare(b.item.title, a.item.title)
      return difference || a.index - b.index
    })
    .map(({ item }) => item)
}

/** Validates a stored pin list: strings only, no duplicates, unknown slugs dropped. */
export function normalizePins(value: unknown, knownSlugs: readonly string[]): string[] {
  if (!Array.isArray(value)) return []
  const known = new Set(knownSlugs)
  return [...new Set(value.filter((slug): slug is string => typeof slug === 'string' && known.has(slug)))]
}

export function togglePin(pinned: readonly string[], slug: string): string[] {
  return pinned.includes(slug) ? pinned.filter((item) => item !== slug) : [slug, ...pinned]
}
