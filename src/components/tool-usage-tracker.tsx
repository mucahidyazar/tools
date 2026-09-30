'use client'

import { useEffect } from 'react'
import { TOOL_USAGE_EVENT } from '@/lib/tool-ranking'

const COOLDOWN_MS = 30_000
const pending = new Set<string>()
const lastSent = new Map<string, number>()
export type ToolUsageUpdate = { slug: string; count: number }

/** Counts a successful tool-page opening. Calculator values never leave the browser. */
export function ToolUsageTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `tool-usage:${slug}`
    let previous = lastSent.get(slug) ?? 0
    try { previous = Math.max(previous, Number(sessionStorage.getItem(key) || 0)) } catch { /* Storage is optional. */ }
    if (pending.has(slug) || Date.now() - previous < COOLDOWN_MS) return

    pending.add(slug)
    const sentAt = Date.now()
    void fetch('/api/tool-usage', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, visitId: crypto.randomUUID() }),
      keepalive: true,
    }).then(async (response) => {
      if (!response.ok) return
      const value = await response.json() as Partial<ToolUsageUpdate>
      if (value.slug !== slug || !Number.isSafeInteger(value.count) || (value.count as number) < 0) return
      lastSent.set(slug, sentAt)
      try { sessionStorage.setItem(key, String(sentAt)) } catch { /* Storage is optional. */ }
      window.dispatchEvent(new CustomEvent<ToolUsageUpdate>(TOOL_USAGE_EVENT, { detail: { slug, count: value.count as number } }))
    }).catch(() => { /* A counter outage must not interrupt the tool. */ }).finally(() => pending.delete(slug))
  }, [slug])

  return null
}
