import assert from 'node:assert/strict'
import test from 'node:test'
import { clarityFor, ITEMS, LETTERS, MAX_SCORE, neighbouringTypes, normalizeResponses, PAIRS, scoreResponses, serializeResponses, TYPES, type Response } from './personality'

const all = (value: Response) => ITEMS.map(() => value)

test('the inventory is balanced per dimension, alternates poles and is fully translated', () => {
  assert.equal(ITEMS.length, 32)
  for (const dimension of ['EI', 'SN', 'TF', 'JP'] as const) {
    const items = ITEMS.filter((item) => item.dimension === dimension)
    assert.equal(items.length, 8)
    assert.equal(items.filter((item) => item.left === PAIRS[dimension][0]).length, 4)
    assert.ok(items.every((item) => PAIRS[dimension].includes(item.left)))
  }
  assert.ok(ITEMS.every((item) => item.leftText.tr && item.leftText.en && item.rightText.tr && item.rightText.en))
  assert.equal(new Set(ITEMS.map((item) => item.id)).size, 32)
  assert.equal(Object.keys(TYPES).length, 16)
  assert.equal(Object.keys(LETTERS).length, 8)
})

test('scores follow the statement that was chosen, not the side it appeared on', () => {
  const towardsFirstLetters = ITEMS.map((item) => (item.left === PAIRS[item.dimension][0] ? 1 : 5)) as Response[]
  const result = scoreResponses(towardsFirstLetters)
  assert.equal(result.type, 'ESTJ')
  assert.ok(result.dimensions.every((dimension) => dimension.score === MAX_SCORE && dimension.strength === 100 && dimension.clarity === 'veryClear' && dimension.firstShare === 100))
  const opposite = scoreResponses(towardsFirstLetters.map((value) => (6 - value) as Response))
  assert.equal(opposite.type, 'INFP')
  assert.ok(opposite.dimensions.every((dimension) => dimension.firstShare === 0))
})

test('neutral answers leave a dimension balanced instead of picking a letter', () => {
  const neutral = scoreResponses(all(3))
  assert.equal(neutral.type, null)
  assert.equal(neutral.pattern, 'XXXX')
  assert.equal(neutral.possibleTypes.length, 16)
  assert.ok(neutral.dimensions.every((dimension) => dimension.clarity === 'balanced' && dimension.firstShare === 50))
  assert.equal(clarityFor(1), 'slight')
  assert.equal(clarityFor(4), 'moderate')
  assert.equal(clarityFor(9), 'clear')
  assert.equal(clarityFor(-13), 'veryClear')
})

test('partial and restored sheets never count as complete', () => {
  const partial = [1, 5, 3, ...Array(29).fill(undefined)] as (Response | undefined)[]
  const restored = normalizeResponses(JSON.parse(serializeResponses(partial)))
  assert.equal(restored.length, 32)
  assert.deepEqual(restored.slice(0, 4), [1, 5, 3, undefined])
  const result = scoreResponses(restored)
  assert.equal(result.answered, 3)
  assert.equal(result.complete, false)
  assert.deepEqual(normalizeResponses([0, 6, 'x', null, 2]).filter((value) => value !== undefined), [2])
  assert.equal(scoreResponses(normalizeResponses(Array(32).fill(1))).complete, true)
})

test('neighbouring types flip the weakest preference first', () => {
  const responses = ITEMS.map((item) => {
    const towardsFirst = item.left === PAIRS[item.dimension][0] ? 1 : 5
    if (item.dimension === 'JP') return item.id % 16 === 4 ? 3 : towardsFirst
    return towardsFirst
  }) as Response[]
  const result = scoreResponses(responses)
  assert.equal(result.type, 'ESTJ')
  assert.equal(neighbouringTypes(result)[0], 'ESTP')
  assert.equal(neighbouringTypes(result).length, 4)
  assert.deepEqual(neighbouringTypes(scoreResponses(all(3))), [])
})
