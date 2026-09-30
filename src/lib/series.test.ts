import assert from 'node:assert/strict'
import test from 'node:test'
import { commonLastMonth, earliestCommonMonth, firstAvailable, formatMonthKey, lastAvailable, lastAvailableInYear, monthAt, seriesPoints, seriesYears, valueAt } from './series'

const series = { start: '2023-11', values: [1, 2, null, 4, 5, null] }

test('compact monthly series resolve months, gaps and boundaries', () => {
  assert.deepEqual(monthAt(series, 0), { year: 2023, month: 11 })
  assert.deepEqual(monthAt(series, 2), { year: 2024, month: 1 })
  assert.equal(valueAt(series, { year: 2024, month: 1 }), null)
  assert.equal(valueAt(series, { year: 2024, month: 2 }), 4)
  assert.equal(valueAt(series, { year: 2020, month: 1 }), null)
  assert.equal(valueAt(series, { year: 2030, month: 1 }), null)
  assert.deepEqual(firstAvailable(series), { year: 2023, month: 11, value: 1 })
  assert.deepEqual(lastAvailable(series), { year: 2024, month: 3, value: 5 })
  assert.deepEqual(lastAvailableInYear(series, 2023), { year: 2023, month: 12, value: 2 })
  assert.equal(lastAvailableInYear(series, 2022), null)
  assert.deepEqual(seriesYears(series), [2023, 2024])
  assert.equal(formatMonthKey({ year: 2024, month: 3 }), '2024-03')
})

test('ranges and cross-series bounds skip unpublished months', () => {
  assert.deepEqual(seriesPoints(series, { year: 2023, month: 12 }, { year: 2024, month: 2 }), [{ year: 2023, month: 12, value: 2 }, { year: 2024, month: 2, value: 4 }])
  const other = { start: '2024-01', values: [null, 7, 8, 9, 10] }
  assert.deepEqual(commonLastMonth(series, other), { year: 2024, month: 3 })
  assert.deepEqual(earliestCommonMonth(series, other), { year: 2024, month: 2 })
  assert.equal(commonLastMonth(series, { start: '2024-01', values: [null] }), null)
})
