import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'
import { TOOL_RELEASE_DATES } from '@/lib/tool-promotions'
import { tools } from '@/lib/tools'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const ready = tools.filter((tool) => tool.status !== 'Yakında')
  const newest = ready.map((tool) => TOOL_RELEASE_DATES[tool.slug]).filter(Boolean).sort().at(-1)
  return [
    { url: absoluteUrl('/'), lastModified: newest ? new Date(newest) : new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/contact'), lastModified: new Date('2026-09-27'), changeFrequency: 'yearly', priority: 0.5 },
    ...ready.map((tool) => ({ url: absoluteUrl(`/tools/${tool.slug}`), lastModified: new Date(TOOL_RELEASE_DATES[tool.slug] ?? Date.now()), changeFrequency: 'monthly' as const, priority: 0.8 })),
  ]
}
