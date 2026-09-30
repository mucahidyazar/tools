import assert from 'node:assert/strict'
import test from 'node:test'
import { assetCoverage, assetPrice, inflationPath, investmentOutcome, latestExchangeRate, periodicIrr, usdRate } from './market-data'

const jan2020 = { year: 2020, month: 1 }

test('asset prices are expressed in the base currency per unit', () => {
  const usd = assetPrice('USD', jan2020)!
  assert.ok(usd > 5 && usd < 7, `USD/TRY Jan 2020 was ${usd}`)
  const gold = assetPrice('GOLD', jan2020)!
  assert.ok(gold > 250 && gold < 400, `gram gold Jan 2020 was ${gold}`)
  const goldUsd = assetPrice('GOLD', jan2020, 'USD')!
  assert.ok(goldUsd > 45 && goldUsd < 55, `gram gold in USD was ${goldUsd}`)
  const usdInEur = assetPrice('USD', jan2020, 'EUR')!
  assert.ok(usdInEur > 0.85 && usdInEur < 0.95, `USD in EUR was ${usdInEur}`)
  const tryInJpy = assetPrice('TRY', jan2020, 'JPY')!
  assert.ok(tryInJpy > 15 && tryInJpy < 22, `TRY in JPY was ${tryInJpy}`)
  assert.equal(assetPrice('EUR', { year: 1995, month: 1 }), null)
  assert.equal(assetPrice('TRY', jan2020, 'TRY'), null)
  assert.equal(assetPrice('DEPOSIT', jan2020, 'USD'), null)
  assert.equal(usdRate('USD', jan2020), 1)
  assert.ok(usdRate('INR', jan2020)! > 60)
  assert.equal(assetCoverage('EUR')!.first.year, 1999)
  assert.equal(assetCoverage('GOLD')!.first.year, 1960)
  assert.equal(assetCoverage('DEPOSIT', 'USD'), null)
  assert.equal(assetCoverage('CNY', 'USD')!.first.year, 1981)
})

test('a lump sum tracks units, latest value, IRR and the CPI comparison', () => {
  const outcome = investmentOutcome({ kind: 'lump', amount: 1000 }, 'USD', jan2020)!
  assert.ok(outcome.units > 150 && outcome.units < 180)
  assert.equal(outcome.contributions, 1)
  assert.equal(outcome.totalInvested, 1000)
  assert.equal(outcome.base, 'TRY')
  assert.ok(outcome.end.year >= 2026)
  assert.ok(outcome.value > 7000, `value was ${outcome.value}`)
  assert.ok(outcome.nominalReturnPercent > 500)
  assert.ok(Math.abs(outcome.path[0].value - 1000) < 1e-9)
  assert.ok(outcome.inflation && outcome.inflation.country === 'TR' && outcome.inflation.through.year >= 2025)
  const years = (outcome.end.year - 2020) + (outcome.end.month - 1) / 12
  const cagr = ((outcome.value / 1000) ** (1 / years) - 1) * 100
  assert.ok(Math.abs(outcome.annualizedReturnPercent! - cagr) < 0.5, `IRR ${outcome.annualizedReturnPercent} vs CAGR ${cagr}`)
  assert.equal(outcome.yearly.reduce((sum, year) => sum + year.invested, 0), 1000)
  assert.equal(outcome.usdReturnPercent, null)
  assert.ok(investmentOutcome({ kind: 'lump', amount: 1000 }, 'GOLD', jan2020)!.usdReturnPercent! > 0)
})

test('periodic contributions accumulate units at each month’s price and can be yearly', () => {
  const monthly = investmentOutcome({ kind: 'periodic', amount: 1000 }, 'GOLD', { year: 2022, month: 1 })!
  assert.equal(monthly.contributions, monthly.months)
  assert.equal(monthly.totalInvested, 1000 * monthly.months)
  const expectedUnits = monthly.path.reduce((sum, point) => sum + 1000 / point.price, 0)
  assert.ok(Math.abs(monthly.units - expectedUnits) < 1e-9)
  assert.ok(Math.abs(monthly.averageCost! - monthly.totalInvested / monthly.units) < 1e-9)
  assert.ok(monthly.value > monthly.totalInvested)
  const yearly = investmentOutcome({ kind: 'periodic', amount: 12_000 }, 'GOLD', { year: 2022, month: 1 }, { frequency: 'yearly' })!
  assert.equal(yearly.contributions, Math.ceil(yearly.months / 12))
  assert.equal(yearly.path[12].contribution, 12_000)
  assert.equal(yearly.path[1].contribution, 0)
})

test('contributions can be denominated in another currency and converted at that month’s rate', () => {
  const dollars = investmentOutcome({ kind: 'periodic', amount: 100 }, 'GOLD', { year: 2023, month: 1 }, { contributionCurrency: 'USD' })!
  assert.equal(dollars.contributionCurrency, 'USD')
  const expected = dollars.path.map((point) => 100 * usdRate('TRY', point)!)
  dollars.path.forEach((point, index) => assert.ok(Math.abs(point.contribution - expected[index]) < 1e-6))
  assert.ok(dollars.path[dollars.path.length - 1].contribution > dollars.path[0].contribution, 'lira cost of 100 dollars rises as the lira weakens')
  const yen = investmentOutcome({ kind: 'periodic', amount: 10_000 }, 'USD', { year: 2015, month: 1 }, { base: 'JPY' })!
  assert.equal(yen.base, 'JPY')
  assert.equal(yen.inflation, null)
  assert.ok(yen.value > 0)
  const euroGold = investmentOutcome({ kind: 'lump', amount: 5_000 }, 'GOLD', { year: 2010, month: 1 }, { base: 'EUR' })!
  assert.equal(euroGold.inflation!.country, 'DE')
  assert.ok(euroGold.usdReturnPercent! > 0)
})

test('a periodic plan can start with a lump sum in the base currency', () => {
  const combined = investmentOutcome({ kind: 'periodic', amount: 1000, initial: 5000 }, 'USD', { year: 2023, month: 1 })!
  const periodicOnly = investmentOutcome({ kind: 'periodic', amount: 1000 }, 'USD', { year: 2023, month: 1 })!
  assert.equal(combined.path[0].contribution, 6000)
  assert.equal(combined.totalInvested, periodicOnly.totalInvested + 5000)
  assert.ok(Math.abs(combined.units - (periodicOnly.units + 5000 / combined.startPrice)) < 1e-9)
  const initialOnly = investmentOutcome({ kind: 'periodic', amount: 0, initial: 5000 }, 'GOLD', { year: 2023, month: 1 })!
  assert.equal(initialOnly.contributions, 1)
  assert.equal(initialOnly.totalInvested, 5000)
  const unitsWithInitial = investmentOutcome({ kind: 'periodic-units', amount: 1, initial: 3000 }, 'GOLD', { year: 2023, month: 1 })!
  assert.ok(Math.abs(unitsWithInitial.path[0].unitsBought - (1 + 3000 / unitsWithInitial.startPrice)) < 1e-9)
})

test('buying a fixed number of units every month costs that month’s price', () => {
  const outcome = investmentOutcome({ kind: 'periodic-units', amount: 100 }, 'USD', { year: 2023, month: 1 })!
  assert.ok(Math.abs(outcome.units - 100 * outcome.months) < 1e-9)
  const expectedCost = outcome.path.reduce((sum, point) => sum + 100 * point.price, 0)
  assert.ok(Math.abs(outcome.totalInvested - expectedCost) < 1e-6)
  assert.ok(Math.abs(outcome.value - outcome.units * outcome.endPrice) < 1e-6)
})

test('impossible investments return null instead of misleading numbers', () => {
  assert.equal(investmentOutcome({ kind: 'lump', amount: 0 }, 'USD', jan2020), null)
  assert.equal(investmentOutcome({ kind: 'lump', amount: 1000 }, 'EUR', { year: 1990, month: 1 }), null)
  assert.equal(investmentOutcome({ kind: 'periodic', amount: 1000 }, 'GOLD', { year: 2999, month: 1 }), null)
  assert.equal(investmentOutcome({ kind: 'lump', amount: 1000 }, 'USD', jan2020, { base: 'USD' }), null)
  assert.equal(investmentOutcome({ kind: 'lump', amount: 1000 }, 'DEPOSIT', jan2020, { base: 'USD' }), null)
})

test('lira deposits compound monthly at the annual rate divided by twelve, net of withholding', () => {
  const gross = investmentOutcome({ kind: 'lump', amount: 1000 }, 'DEPOSIT', { year: 2023, month: 1 }, { withholdingPercent: 0 })!
  const net = investmentOutcome({ kind: 'lump', amount: 1000 }, 'DEPOSIT', { year: 2023, month: 1 }, { withholdingPercent: 15 })!
  assert.ok(gross.value > net.value && net.value > 1000)
  assert.ok(Math.abs(gross.path[0].value - 1000 * (1 + gross.path[0].price / 100 / 12)) < 1e-9)
  assert.ok(gross.path.every((point) => point.interest > 0))
  assert.ok(Math.abs(gross.deposit!.totalInterest - (gross.value - 1000)) < 1e-6)
  const monthly = investmentOutcome({ kind: 'periodic-units', amount: 500 }, 'DEPOSIT', { year: 2024, month: 1 })!
  assert.equal(monthly.plan.kind, 'periodic')
  assert.equal(monthly.totalInvested, 500 * monthly.months)
  const gapYear = investmentOutcome({ kind: 'periodic', amount: 1000 }, 'DEPOSIT', { year: 2023, month: 1 })!
  assert.equal(gapYear.yearly[0].invested, 12_000, 'months without a published rate still take the contribution')
  assert.ok(gapYear.path.some((point) => point.estimated))
})

test('IRR solves simple cash flows and rejects impossible ones', () => {
  assert.ok(Math.abs(periodicIrr([-100, 110])! - 0.1) < 1e-6)
  assert.ok(Math.abs(periodicIrr([-100, -100, 220])! - 0.0653) < 1e-3)
  assert.equal(periodicIrr([-100, -100]), null)
})

test('the inflation path follows the base currency’s CPI', () => {
  const path = inflationPath(1000, jan2020)
  assert.ok(Math.abs(path[0].value - 1000) < 1e-9)
  assert.ok(path.at(-1)!.value > 3000)
  assert.ok(inflationPath(1000, jan2020, 'USD').at(-1)!.value < 1400)
  assert.equal(inflationPath(1000, jan2020, 'JPY').length, 0)
})

test('the CPI country can be chosen independently of the base currency', () => {
  const liraCpi = investmentOutcome({ kind: 'lump', amount: 1000 }, 'USD', jan2020)!
  const dollarCpi = investmentOutcome({ kind: 'lump', amount: 1000 }, 'USD', jan2020, { inflationCountry: 'US' })!
  assert.equal(dollarCpi.base, 'TRY')
  assert.equal(dollarCpi.inflation!.country, 'US')
  assert.ok(liraCpi.inflation!.adjustedInvested > dollarCpi.inflation!.adjustedInvested, 'lira prices rose far more than dollar prices')
  assert.ok(Math.abs(liraCpi.inflation!.realProfit - (liraCpi.inflation!.valueThrough - liraCpi.inflation!.adjustedInvested)) < 1e-9)
  assert.ok(liraCpi.inflation!.periodInflationPercent! > 200, `TR period inflation was ${liraCpi.inflation!.periodInflationPercent}`)
  assert.ok(liraCpi.inflation!.annualizedInflationPercent! > 20 && liraCpi.inflation!.annualizedInflationPercent! < 60)
  assert.ok(dollarCpi.inflation!.periodInflationPercent! > 15 && dollarCpi.inflation!.periodInflationPercent! < 40)
  const yen = investmentOutcome({ kind: 'periodic', amount: 10_000 }, 'USD', { year: 2015, month: 1 }, { base: 'JPY', inflationCountry: 'US' })!
  assert.equal(yen.inflation!.country, 'US')
  assert.ok(inflationPath(1000, jan2020, 'JPY', 'US').at(-1)!.value > 1150)
})

test('the latest cross rate comes from the last month both currencies are quoted', () => {
  const usdTry = latestExchangeRate('USD', 'TRY')!
  assert.ok(usdTry.rate > 30 && usdTry.rate < 80, `USD/TRY was ${usdTry.rate}`)
  assert.ok(usdTry.month!.year >= 2026)
  assert.ok(Math.abs(latestExchangeRate('TRY', 'USD')!.rate * usdTry.rate - 1) < 1e-9)
  const eurUsd = latestExchangeRate('EUR', 'USD')!
  assert.ok(eurUsd.rate > 0.9 && eurUsd.rate < 1.4, `EUR/USD was ${eurUsd.rate}`)
  const eurTry = latestExchangeRate('EUR', 'TRY')!
  assert.ok(Math.abs(eurTry.rate - eurUsd.rate * usdTry.rate) < 1e-6)
  assert.deepEqual(latestExchangeRate('USD', 'USD'), { rate: 1, month: null })
})
