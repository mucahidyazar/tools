import assert from 'node:assert/strict'
import test from 'node:test'
import { getActivePromotion, normalizePins, sortTools, togglePin, type ToolSort } from './tool-ranking'
import type { ToolPromotion } from './tool-promotions'

const now = new Date('2026-09-26T12:00:00Z')
const items = [
  { slug: 'first', title: 'Zebra', publishedAt: '2026-01-01' },
  { slug: 'second', title: 'Alpha', publishedAt: '2026-02-01' },
  { slug: 'third', title: 'Beta', publishedAt: '2026-03-01' },
  { slug: 'fourth', title: 'Gamma', publishedAt: '2026-04-01' },
]
const promotion: ToolPromotion = { slug: 'first', kind: 'recommended', priority: 100, startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-10-01T00:00:00Z' }
const slugs = (list: typeof items) => list.map((tool) => tool.slug)
const sorts: ToolSort[] = ['popular', 'newest', 'name-asc', 'name-desc']

test('popular ordering uses real counts and stable input order for ties', () => {
  assert.deepEqual(slugs(sortTools(items, { second: 10, third: 10 }, 'popular', { now, language: 'en', promotions: [] })), ['second', 'third', 'first', 'fourth'])
  assert.deepEqual(slugs(items), ['first', 'second', 'third', 'fourth'])
  assert.deepEqual(slugs(sortTools(items, { first: NaN, second: -10 }, 'popular', { now, language: 'en', promotions: [] })), ['first', 'second', 'third', 'fourth'])
})

test('active promotions stay first under every selected ordering', () => {
  for (const sort of sorts) assert.equal(sortTools(items, { second: 100 }, sort, { now, language: 'en', promotions: [promotion] })[0].slug, 'first')
})

test('future, expired, and invalid promotion windows never pin a tool', () => {
  assert.equal(getActivePromotion('first', new Date('2026-08-31'), [promotion]), undefined)
  assert.equal(getActivePromotion('first', new Date(promotion.endsAt), [promotion]), undefined)
  assert.equal(getActivePromotion('first', now, [{ ...promotion, startsAt: 'invalid' }]), undefined)
  assert.equal(getActivePromotion('first', new Date(promotion.startsAt), [promotion]), promotion)
})

test('promotion priorities are fixed regardless of selected ordering', () => {
  const promotions = [promotion, { ...promotion, slug: 'third', priority: 200 }]
  for (const sort of sorts) assert.deepEqual(slugs(sortTools(items, { second: 1000 }, sort, { now, language: 'en', promotions })).slice(0, 2), ['third', 'first'])
})

test('newest and alphabetic ordering work after expired pins', () => {
  const later = new Date('2027-01-01')
  assert.deepEqual(slugs(sortTools(items, {}, 'newest', { now: later, language: 'en', promotions: [promotion] })), ['fourth', 'third', 'second', 'first'])
  assert.deepEqual(slugs(sortTools(items, {}, 'name-asc', { now: later, language: 'en', promotions: [promotion] })), ['second', 'third', 'fourth', 'first'])
  assert.deepEqual(slugs(sortTools(items, {}, 'name-desc', { now: later, language: 'en', promotions: [promotion] })), ['first', 'fourth', 'third', 'second'])
})

test('visitor pins follow promotions, keep their own order and ignore the selected sort', () => {
  for (const sort of sorts) {
    const result = slugs(sortTools(items, { second: 1000, fourth: 5 }, sort, { now, language: 'en', promotions: [promotion], pinned: ['fourth', 'second'] }))
    assert.deepEqual(result.slice(0, 3), ['first', 'fourth', 'second'])
  }
  assert.deepEqual(slugs(sortTools(items, { third: 9 }, 'popular', { now, language: 'en', promotions: [], pinned: ['second'] })), ['second', 'third', 'first', 'fourth'])
})

test('pin lists are validated and toggled immutably', () => {
  const known = items.map((item) => item.slug)
  assert.deepEqual(normalizePins(['second', 'second', 'ghost', 4], known), ['second'])
  assert.deepEqual(normalizePins('bad', known), [])
  const pinned = ['second']
  assert.deepEqual(togglePin(pinned, 'third'), ['third', 'second'])
  assert.deepEqual(togglePin(pinned, 'second'), [])
  assert.deepEqual(pinned, ['second'])
})

test('filtered tools remain a subset without reinserting pinned tools', () => {
  assert.deepEqual(slugs(sortTools(items.slice(1), { second: 20 }, 'popular', { now, language: 'en', promotions: [promotion] })), ['second', 'third', 'fourth'])
})
