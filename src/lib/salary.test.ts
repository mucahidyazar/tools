import assert from 'node:assert/strict'
import test from 'node:test'
import { grossToNet, netToGross, progressiveTax, SALARY_PARAMETERS_2025 } from './salary'

test('the 2025 minimum wage nets the officially announced amount in every month', () => {
  const result = grossToNet(SALARY_PARAMETERS_2025.minimumWageGross)
  assert.equal(result.months.length, 12)
  for (const month of result.months) {
    assert.equal(month.net, 22104.67)
    assert.equal(month.incomeTax, 0)
    assert.equal(month.stampTax, 0)
  }
})

test('higher wages pay cumulative progressive tax that rises through the year', () => {
  const result = grossToNet(50_000)
  assert.equal(result.months[0].sgk, 7000)
  assert.equal(result.months[0].unemployment, 500)
  assert.ok(Math.abs(result.months[0].net - 39258.58) < 0.02, `January net was ${result.months[0].net}`)
  assert.ok(result.months[11].net < result.months[0].net)
  assert.ok(result.months[3].incomeTax > result.months[2].incomeTax)
  assert.equal(result.totalGross, 600_000)
  assert.ok(Math.abs(result.totalNet - result.months.reduce((sum, month) => sum + month.net, 0)) < 0.02)
  const withoutExemption = grossToNet(50_000, SALARY_PARAMETERS_2025, { minimumWageExemption: false })
  assert.ok(withoutExemption.months[0].net < result.months[0].net)
})

test('SGK premiums are capped at the ceiling and the bracket helper is exact', () => {
  const ceiling = SALARY_PARAMETERS_2025.minimumWageGross * SALARY_PARAMETERS_2025.sgkCeilingMultiplier
  const result = grossToNet(300_000)
  assert.equal(result.months[0].sgk, Math.round(ceiling * 0.14 * 100) / 100)
  assert.equal(progressiveTax(0, 158_000, SALARY_PARAMETERS_2025.brackets), 23_700)
  assert.equal(progressiveTax(150_000, 20_000, SALARY_PARAMETERS_2025.brackets), 8_000 * 0.15 + 12_000 * 0.2)
  assert.equal(progressiveTax(5_000_000, 10_000, SALARY_PARAMETERS_2025.brackets), 4_000)
  assert.equal(grossToNet(NaN).months[0].net, 0)
})

test('net-to-gross inverts gross-to-net for the chosen month', () => {
  const gross = netToGross(39258.58)
  assert.ok(Math.abs(gross - 50_000) < 0.05, `gross was ${gross}`)
  const december = netToGross(30_000, SALARY_PARAMETERS_2025, { month: 12 })
  assert.ok(Math.abs(grossToNet(december).months[11].net - 30_000) < 0.05)
  assert.equal(netToGross(0), 0)
})
