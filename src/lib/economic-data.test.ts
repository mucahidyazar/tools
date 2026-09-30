import assert from 'node:assert/strict'
import test from 'node:test'
import { adjustForInflation, annualInflation, availableYears, averageAnnualInflation, dataCoverage, inflationFactor, latestAnnualInflation, monthlyInflation } from './economic-data'

test('coverage reports the real first and last published months per country', () => {
  const turkey = dataCoverage('TR')!
  assert.deepEqual(turkey.first, { year: 1955, month: 1 })
  assert.ok(turkey.last.year >= 2025)
  assert.ok(dataCoverage('US')!.last.year >= 2026)
  assert.equal(availableYears('TR')[0], 1955)
  assert.ok(availableYears('US').includes(2026))
})

test('monthly changes skip unpublished months instead of inventing zeros', () => {
  const us2025 = monthlyInflation('US', 2025)
  assert.equal(us2025.length, 10)
  assert.ok(us2025.every((point) => point.month !== 10 && point.month !== 11))
  const tr2023 = monthlyInflation('TR', 2023)
  assert.equal(tr2023.length, 12)
  assert.ok(tr2023.every((point) => Number.isFinite(point.value)))
})

test('annual inflation matches official year-end figures and flags partial years', () => {
  const turkey2023 = annualInflation('TR', 2023)!
  assert.ok(turkey2023.value > 60 && turkey2023.value < 70, `TR 2023 was ${turkey2023.value}`)
  assert.equal(turkey2023.partial, false)
  const partial = annualInflation('TR', dataCoverage('TR')!.last.year)!
  assert.equal(partial.partial, true)
  assert.equal(annualInflation('TR', 1900), null)
})

test('purchasing power uses annual averages and clamps to the last published year', () => {
  const us = adjustForInflation(100, 'US', 2000, 2020)!
  assert.ok(us.value > 148 && us.value < 152, `US 2000→2020 gave ${us.value}`)
  assert.equal(us.from.months, 12)
  const clamped = inflationFactor('TR', 1990, 2999)!
  assert.equal(clamped.to.year, dataCoverage('TR')!.last.year)
  assert.equal(inflationFactor('TR', 1900, 2020), null)
  assert.equal(inflationFactor('TR', 2020, 2010)!.factor, 1)
  assert.equal(adjustForInflation(NaN, 'US', 2000, 2020), null)
})

test('the headline annual inflation compares the latest month with a year earlier', () => {
  const turkey = latestAnnualInflation('TR')!
  assert.ok(turkey.value > 10 && turkey.value < 80, `TR latest was ${turkey.value}`)
  assert.deepEqual(turkey.through, dataCoverage('TR')!.last)
  const us = latestAnnualInflation('US')!
  assert.ok(us.value > 0 && us.value < 10, `US latest was ${us.value}`)
  assert.ok(latestAnnualInflation('DE')!.value < latestAnnualInflation('TR')!.value)
})

test('the ten-year average is a compound rate ending at the latest month', () => {
  const turkey = averageAnnualInflation('TR')!
  assert.ok(turkey.value > 15 && turkey.value < 45, `TR ten-year average was ${turkey.value}`)
  assert.equal(turkey.years, 10)
  assert.deepEqual(turkey.through, dataCoverage('TR')!.last)
  assert.equal(turkey.from.year, turkey.through.year - 10)
  const us = averageAnnualInflation('US')!
  assert.ok(us.value > 1 && us.value < 6, `US ten-year average was ${us.value}`)
  assert.ok(averageAnnualInflation('DE')!.value < us.value + 2)
  assert.equal(averageAnnualInflation('US', 0), null)
  assert.ok(Math.abs(averageAnnualInflation('US', 1)!.value - latestAnnualInflation('US')!.value) < 1e-9)
})
