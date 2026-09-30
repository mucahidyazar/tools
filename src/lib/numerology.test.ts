import assert from 'node:assert/strict'
import test from 'node:test'
import { NUMEROLOGY_LABELS, numerologyFromDate, numerologyMeaning, reduceNumber, wheelPosition } from './numerology'

test('numerology keeps master numbers and returns date-derived dimensions', () => {
  const result = numerologyFromDate('1984-11-29', new Date('2026-01-01T00:00:00Z'))
  assert.equal(result.lifePath, 8)
  assert.equal(result.birthday, 11)
  assert.equal(result.attitude, 4)
  assert.equal(result.personalYear, 5)
  assert.equal(result.year, 2026)
  assert.deepEqual(result.scores.map((score) => score.key), ['lifePath', 'birthday', 'attitude', 'personalYear'])
  assert.equal(reduceNumber(29), 11)
  assert.equal(reduceNumber(29, false), 2)
  assert.equal(wheelPosition(22), 4)
})

test('numerology rejects impossible dates and exposes bilingual labels', () => {
  assert.throws(() => numerologyFromDate('2024-02-30'))
  assert.throws(() => numerologyFromDate('not-a-date'))
  assert.equal(NUMEROLOGY_LABELS.lifePath.en, 'Life path')
  assert.equal(numerologyMeaning(11, 'en').title, 'Inspiration')
  assert.equal(numerologyMeaning(11, 'tr').title, 'İlham')
})

test('name numbers use Pythagorean values and understand Turkish letters', async () => {
  const { numerologyFromName, normalizeName, personalCycle, maturityNumber, reductionTrail } = await import('./numerology')
  assert.equal(normalizeName('Şeyma Öztürk-İpek'), 'seymaozturkipek')
  assert.equal(normalizeName('Анна Щукина'), 'annashchukina')
  const name = numerologyFromName('Ada')!
  assert.equal(name.expressionSum, 6)
  assert.equal(name.soulUrgeSum, 2)
  assert.equal(name.personalitySum, 4)
  assert.equal(name.expression, 6)
  assert.equal(numerologyFromName('   '), null)
  const cycle = personalCycle('1984-11-29', new Date('2026-03-15T12:00:00'))
  assert.equal(cycle.year, 5)
  assert.equal(cycle.month, 8)
  assert.equal(cycle.day, 5)
  assert.equal(maturityNumber(8, 6), 5)
  assert.equal(reductionTrail(29), '29 → 11')
  assert.equal(reductionTrail(35), '35 → 8')
})
