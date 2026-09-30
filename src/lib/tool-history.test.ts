import assert from 'node:assert/strict'
import test from 'node:test'
import { addHistoryEntry, createMemoryStorage, HISTORY_LIMIT, historySignature, historyStorageKey, isBlankSnapshot, normalizeHistoryEntries, readHistory, removeHistoryEntry, writeHistory } from './tool-history'

const snapshot = (index: number) => ({ amount: String(index), rate: 12, details: false })

test('history keeps at most ten entries per tool, newest first', () => {
  let entries = addHistoryEntry([], snapshot(0), 0, 'first')
  for (let index = 1; index <= HISTORY_LIMIT + 2; index += 1) entries = addHistoryEntry(entries, snapshot(index), index)
  assert.equal(entries.length, HISTORY_LIMIT)
  assert.equal(entries[0].values.amount, String(HISTORY_LIMIT + 2))
  assert.equal(entries.some((entry) => entry.id === 'first'), false)
})

test('re-running an identical query moves it to the top without duplicates, regardless of key order', () => {
  const first = addHistoryEntry([], { amount: '10', rate: 5 }, 1, 'a')
  const second = addHistoryEntry(first, { amount: '20', rate: 5 }, 2, 'b')
  const again = addHistoryEntry(second, { rate: 5, amount: '10' }, 3, 'c')
  assert.deepEqual(again.map((entry) => entry.id), ['c', 'b'])
  assert.equal(historySignature({ a: 1, b: '2' }), historySignature({ b: '2', a: 1 }))
  assert.equal(isBlankSnapshot({ amount: '', flag: false }), true)
  assert.equal(isBlankSnapshot({ amount: '0', flag: false }), false)
})

test('deleting an entry never lets it reappear on the next save', () => {
  const storage = createMemoryStorage()
  const entries = addHistoryEntry(addHistoryEntry([], snapshot(1), 1, 'one'), snapshot(2), 2, 'two')
  const afterDelete = removeHistoryEntry(entries, 'one')
  writeHistory(storage, 'kredi-odeme', afterDelete)
  const afterNewQuery = addHistoryEntry(readHistory(storage, 'kredi-odeme'), snapshot(3), 3, 'three')
  assert.deepEqual(afterNewQuery.map((entry) => entry.id), ['three', 'two'])
})

test('restore round-trips the exact values that were saved', () => {
  const storage = createMemoryStorage()
  const values = { principal: '100000', currency: 'USD', showDetails: true, conversion: '0.031' }
  writeHistory(storage, 'faiz-hesaplama', addHistoryEntry([], values, 5, 'saved'))
  const [entry] = readHistory(storage, 'faiz-hesaplama')
  assert.deepEqual(entry, { id: 'saved', createdAt: 5, values })
})

test('history survives a reload and stays separate per tool', () => {
  const storage = createMemoryStorage()
  writeHistory(storage, 'bmi', addHistoryEntry([], { height: '180' }, 1, 'bmi-1'))
  writeHistory(storage, 'kdv-vergi', addHistoryEntry([], { amount: '100' }, 2, 'vat-1'))
  assert.equal(readHistory(storage, 'bmi')[0].id, 'bmi-1')
  assert.equal(readHistory(storage, 'kdv-vergi')[0].id, 'vat-1')
  assert.equal(readHistory(storage, 'mbti').length, 0)
  assert.notEqual(historyStorageKey('bmi'), historyStorageKey('kdv-vergi'))
})

test('clearing removes the storage key and malformed storage content is ignored', () => {
  const storage = createMemoryStorage()
  writeHistory(storage, 'qr-code', addHistoryEntry([], { text: 'hello' }, 1))
  writeHistory(storage, 'qr-code', [])
  assert.equal(storage.getItem(historyStorageKey('qr-code')), null)
  storage.setItem(historyStorageKey('qr-code'), '{not json')
  assert.deepEqual(readHistory(storage, 'qr-code'), [])
  storage.setItem(historyStorageKey('qr-code'), JSON.stringify([
    { id: 'ok', createdAt: 1, values: { text: 'a', nested: { skip: true }, bad: NaN } },
    { id: 'ok', createdAt: 2, values: { text: 'duplicate id' } },
    { id: 7, createdAt: 3, values: { text: 'bad id' } },
    { id: 'empty', createdAt: 4, values: {} },
    'garbage',
  ]))
  assert.deepEqual(readHistory(storage, 'qr-code'), [{ id: 'ok', createdAt: 1, values: { text: 'a' } }])
  assert.deepEqual(normalizeHistoryEntries('nope'), [])
  assert.equal(writeHistory(undefined, 'qr-code', []), false)
})
