import assert from 'node:assert/strict'
import test from 'node:test'
import { computeAnnual, germanIncomeTax2025, monthlyGrossForNet, SALARY_COUNTRIES } from './salary-countries'

test('country models produce plausible take-home pay for a middle income', () => {
  const us = computeAnnual('US', 6_000)
  assert.ok(us.net / us.gross > 0.78 && us.net / us.gross < 0.86, `US kept ${us.net / us.gross}`)
  const usState = computeAnnual('US', 6_000, { stateTaxPercent: 5 })
  assert.ok(usState.net < us.net && usState.lines.some((line) => line.key === 'state'))
  const uk = computeAnnual('GB', 3_500)
  assert.ok(uk.net / uk.gross > 0.74 && uk.net / uk.gross < 0.82, `UK kept ${uk.net / uk.gross}`)
  const ukHigh = computeAnnual('GB', 12_000)
  assert.ok(ukHigh.taxable > 144_000 - 12_570 - 0.01 && ukHigh.taxable <= 144_000, 'UK allowance tapers to zero above £125,140')
  const de = computeAnnual('DE', 5_000, { childless: true })
  assert.ok(de.net / de.gross > 0.58 && de.net / de.gross < 0.68, `DE kept ${de.net / de.gross}`)
  assert.ok(computeAnnual('DE', 5_000, { churchTax: true }).net < de.net + 1)
  const tr = computeAnnual('TR', 50_000)
  assert.ok(Math.abs(tr.net - 12 * 38_000) < 12 * 2_000)
  const custom = computeAnnual('CUSTOM', 1_000, { customSocialPercent: 10, customIncomeTaxPercent: 20, customOtherPercent: 5 })
  assert.equal(Math.round(custom.net), Math.round(12_000 - 1_200 - 2_160 - 600))
})

test('the German 2025 tariff has zero tax up to the basic allowance and is continuous', () => {
  assert.equal(germanIncomeTax2025(12_096), 0)
  assert.ok(germanIncomeTax2025(17_443) > 0)
  assert.ok(Math.abs(germanIncomeTax2025(68_480) - germanIncomeTax2025(68_481)) < 2)
  assert.ok(Math.abs(germanIncomeTax2025(277_825) - germanIncomeTax2025(277_826)) < 2)
})

test('net-to-gross inverts every model', () => {
  for (const country of SALARY_COUNTRIES) {
    const options = country === 'CUSTOM' ? { customSocialPercent: 12, customIncomeTaxPercent: 18 } : {}
    const gross = monthlyGrossForNet(country, 3_000, options)
    assert.ok(Math.abs(computeAnnual(country, gross, options).net / 12 - 3_000) < 0.05, `${country} gave ${gross}`)
  }
  assert.equal(monthlyGrossForNet('US', 0), 0)
})
