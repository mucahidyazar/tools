import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { allowUsageRequest, createToolUsageStore, isReadyToolSlug, TOOL_USAGE_COOLDOWN_MS, usageSession } from './server/tool-usage'

test('usage store starts at zero and persists real increments across connections', () => {
  const directory = mkdtempSync(join(tmpdir(), 'tools-usage-test-'))
  const path = join(directory, 'counts.sqlite')
  let store = createToolUsageStore(path)
  try {
    assert.equal(store.readCounts()['compound-interest-calculator'], 0)
    assert.equal(store.readCounts()['home-cost-calculator'], undefined)
    const first = store.recordOpen('compound-interest-calculator', randomUUID(), 'a'.repeat(64))
    assert.deepEqual(first, { slug: 'compound-interest-calculator', count: 1, counted: true })
    store.close()
    store = createToolUsageStore(path)
    assert.equal(store.readCounts()['compound-interest-calculator'], 1)
    assert.equal(store.recordOpen('compound-interest-calculator', randomUUID(), 'b'.repeat(64)).count, 2)
  } finally {
    store.close()
    rmSync(directory, { recursive: true, force: true })
  }
})

test('duplicate visits and rapid same-tool opens never inflate counters', () => {
  const store = createToolUsageStore(':memory:')
  const visit = randomUUID()
  const session = 'a'.repeat(64)
  const now = Date.now()
  try {
    assert.equal(store.recordOpen('compound-interest-calculator', visit, session, now).count, 1)
    assert.equal(store.recordOpen('compound-interest-calculator', visit, 'b'.repeat(64), now).counted, false)
    assert.equal(store.recordOpen('compound-interest-calculator', randomUUID(), session, now + 1).counted, false)
    assert.equal(store.recordOpen('qr-code-generator', randomUUID(), session, now + 1).count, 1)
    assert.equal(store.recordOpen('compound-interest-calculator', randomUUID(), session, now + TOOL_USAGE_COOLDOWN_MS).count, 2)
    assert.throws(() => store.recordOpen('not-a-tool', randomUUID(), session, now))
    assert.throws(() => store.recordOpen('home-cost-calculator', randomUUID(), session, now))
  } finally {
    store.close()
  }
})

test('session signatures cannot be chosen or altered by the caller', () => {
  const session = usageSession()
  assert.equal(session.fresh, true)
  assert.deepEqual(usageSession(session.cookie), { ...session, fresh: false })
  assert.equal(usageSession(session.cookie.slice(0, -1) + (session.cookie.endsWith('0') ? '1' : '0')).fresh, true)
  assert.equal(usageSession('chosen-identity').fresh, true)
})

test('session rate guard resets and ready-slug validation rejects arbitrary input', () => {
  const session = randomUUID()
  const now = Date.now()
  for (let i = 0; i < 30; i += 1) assert.equal(allowUsageRequest(session, now), true)
  assert.equal(allowUsageRequest(session, now), false)
  assert.equal(allowUsageRequest(session, now + 60_000), true)
  assert.equal(isReadyToolSlug('qr-code-generator'), true)
  assert.equal(isReadyToolSlug({ slug: 'qr-code-generator' }), false)
  assert.equal(isReadyToolSlug('home-cost-calculator'), false)
})

test('counts recorded under legacy Turkish slugs migrate to the English slug', () => {
  const store = createToolUsageStore(':memory:')
  try {
    assert.equal(store.readCounts()['compound-interest-calculator'], 0)
  } finally {
    store.close()
  }
  const directory = mkdtempSync(join(tmpdir(), 'tools-usage-migrate-'))
  const path = join(directory, 'counts.sqlite')
  try {
    const seeded = createToolUsageStore(path)
    seeded.recordOpen('compound-interest-calculator', randomUUID(), 'c'.repeat(64))
    seeded.close()
    const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite')
    const raw = new DatabaseSync(path)
    raw.exec("INSERT INTO tool_usage (slug, total) VALUES ('faiz-hesaplama', 41)")
    raw.close()
    const migrated = createToolUsageStore(path)
    assert.equal(migrated.readCounts()['compound-interest-calculator'], 42)
    migrated.close()
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
