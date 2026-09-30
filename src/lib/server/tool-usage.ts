import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { LEGACY_TOOL_SLUGS, tools } from '../tools'
import type { ToolUsageCounts } from '../tool-ranking'

export const TOOL_USAGE_COOLDOWN_MS = 30_000
export const TOOL_USAGE_COOKIE = 'tools_usage_session'
const RECEIPT_RETENTION_MS = 24 * 60 * 60 * 1000
const readySlugs = new Set(tools.filter((tool) => tool.status !== 'Yakında').map((tool) => tool.slug))

export function isReadyToolSlug(value: unknown): value is string {
  return typeof value === 'string' && readySlugs.has(value)
}

/** File-backed SQLite needs one persistent writable volume. Do not use an ephemeral serverless filesystem. */
export function createToolUsageStore(filename: string) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true })
  const db = new DatabaseSync(filename)
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS tool_usage (
      slug TEXT PRIMARY KEY,
      total INTEGER NOT NULL DEFAULT 0 CHECK(total >= 0 AND total <= 9007199254740991)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS usage_receipts (
      visit_id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS usage_cooldowns (
      session_hash TEXT NOT NULL,
      slug TEXT NOT NULL,
      last_seen INTEGER NOT NULL,
      PRIMARY KEY(session_hash, slug)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS receipt_expiry ON usage_receipts(created_at);
    CREATE INDEX IF NOT EXISTS cooldown_expiry ON usage_cooldowns(last_seen);
  `)

  // Fold counts recorded under retired Turkish slugs into their English successors.
  const migrate = db.prepare('INSERT INTO tool_usage (slug, total) SELECT ?, total FROM tool_usage WHERE slug = ? ON CONFLICT(slug) DO UPDATE SET total = MIN(tool_usage.total + excluded.total, 9007199254740991)')
  const forget = db.prepare('DELETE FROM tool_usage WHERE slug = ?')
  for (const [legacy, current] of Object.entries(LEGACY_TOOL_SLUGS)) { migrate.run(current, legacy); forget.run(legacy) }

  const read = db.prepare('SELECT slug, total FROM tool_usage')
  const readOne = db.prepare('SELECT total FROM tool_usage WHERE slug = ?')
  const receipt = db.prepare('INSERT OR IGNORE INTO usage_receipts (visit_id, created_at) VALUES (?, ?)')
  const cooldown = db.prepare('SELECT last_seen FROM usage_cooldowns WHERE session_hash = ? AND slug = ?')
  const remember = db.prepare('INSERT INTO usage_cooldowns (session_hash, slug, last_seen) VALUES (?, ?, ?) ON CONFLICT(session_hash, slug) DO UPDATE SET last_seen = excluded.last_seen')
  const increment = db.prepare('INSERT INTO tool_usage (slug, total) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET total = MIN(tool_usage.total + 1, 9007199254740991) RETURNING total')
  const purgeReceipts = db.prepare('DELETE FROM usage_receipts WHERE created_at < ?')
  const purgeCooldowns = db.prepare('DELETE FROM usage_cooldowns WHERE last_seen < ?')
  let lastCleanup = 0

  return {
    readCounts(): ToolUsageCounts {
      const counts: ToolUsageCounts = Object.fromEntries([...readySlugs].map((slug) => [slug, 0]))
      for (const row of read.all()) {
        if (typeof row.slug === 'string' && readySlugs.has(row.slug) && typeof row.total === 'number') counts[row.slug] = row.total
      }
      return counts
    },
    recordOpen(slug: string, visitId: string, sessionHash: string, now = Date.now()) {
      if (!isReadyToolSlug(slug)) throw new Error('Unknown or unavailable tool')
      if (!/^[a-f0-9-]{36}$/i.test(visitId) || !/^[a-f0-9]{64}$/i.test(sessionHash)) throw new Error('Invalid usage identity')
      db.exec('BEGIN IMMEDIATE')
      try {
        const cleanupDue = now - lastCleanup >= 60_000
        if (cleanupDue) {
          purgeReceipts.run(now - RECEIPT_RETENTION_MS)
          purgeCooldowns.run(now - RECEIPT_RETENTION_MS)
        }
        const inserted = receipt.run(visitId, now).changes > 0
        const previous = cooldown.get(sessionHash, slug)
        const eligible = inserted && (!previous || now - Number(previous.last_seen) >= TOOL_USAGE_COOLDOWN_MS)
        let total: number
        if (eligible) {
          remember.run(sessionHash, slug, now)
          total = Number(increment.get(slug)!.total)
        } else {
          total = Number(readOne.get(slug)?.total ?? 0)
        }
        db.exec('COMMIT')
        if (cleanupDue) lastCleanup = now
        return { slug, count: total, counted: eligible }
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
    close() { db.close() },
  }
}

type Store = ReturnType<typeof createToolUsageStore>
const runtime = globalThis as typeof globalThis & {
  toolUsageStore?: Store
  toolUsageCookieKey?: Buffer
  toolUsageRateLimits?: Map<string, { startsAt: number; requests: number }>
}

export function getToolUsageStore() {
  if (!runtime.toolUsageStore) {
    const directory = resolve(process.env.TOOLS_DATA_DIR || join(process.cwd(), '.data'))
    runtime.toolUsageStore = createToolUsageStore(join(directory, 'tool-usage.sqlite'))
  }
  return runtime.toolUsageStore
}

function signature(value: string) {
  runtime.toolUsageCookieKey ??= randomBytes(32)
  return createHmac('sha256', runtime.toolUsageCookieKey).update(value).digest('hex')
}

export function usageSession(existingCookie?: string) {
  let id: string | undefined
  if (existingCookie && /^[a-f0-9]{48}\.[a-f0-9]{64}$/.test(existingCookie)) {
    const [candidate, signed] = existingCookie.split('.')
    const expected = Buffer.from(signature(candidate), 'hex')
    if (timingSafeEqual(expected, Buffer.from(signed, 'hex'))) id = candidate
  }
  const fresh = !id
  id ??= randomBytes(24).toString('hex')
  return { cookie: `${id}.${signature(id)}`, hash: createHash('sha256').update(id).digest('hex'), fresh }
}

/** A bounded in-memory guard complements the persisted per-tool cooldown. No IP or tool input is stored. */
export function allowUsageRequest(sessionHash: string, now = Date.now()) {
  const limits = runtime.toolUsageRateLimits ??= new Map()
  const existing = limits.get(sessionHash)
  if (!existing || now - existing.startsAt >= 60_000) {
    if (limits.size >= 10_000) {
      for (const [key, value] of limits) if (now - value.startsAt >= 60_000) limits.delete(key)
      if (limits.size >= 10_000) limits.delete(limits.keys().next().value!)
    }
    limits.set(sessionHash, { startsAt: now, requests: 1 })
    return true
  }
  existing.requests += 1
  return existing.requests <= 30
}
