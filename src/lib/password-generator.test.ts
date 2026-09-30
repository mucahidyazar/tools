import assert from 'node:assert/strict'
import test from 'node:test'
import effWords from '../../public/data/password-words-en.json'
import { AMBIGUOUS_CHARACTERS, DEFAULT_SYMBOLS, GeneratorError, SIMILAR_CHARACTERS, generateSecrets, getGeneratorInfo, randomBelow, type PasswordOptions } from './password-generator'

const standard: PasswordOptions = { mode: 'password', length: 20, lowercase: true, uppercase: true, numbers: true, symbols: true, requireEachGroup: true, excludeSimilar: false, excludeAmbiguous: false, excludeCharacters: '', customSymbols: DEFAULT_SYMBOLS }
const errorIs = (code: string) => (error: unknown) => error instanceof GeneratorError && error.code === code

test('random sampling rejects out-of-range bytes instead of introducing modulo bias', () => {
  let calls = 0
  const value = randomBelow(BigInt(10), bytes => { bytes.fill(calls++ === 0 ? 255 : 9) })
  assert.equal(value, BigInt(9))
  assert.equal(calls, 2)
  assert.equal(randomBelow(BigInt(1), () => assert.fail('No random byte is needed for a singleton')), BigInt(0))
  assert.throws(() => randomBelow(BigInt(0)), RangeError)
  assert.throws(() => randomBelow(BigInt(10), bytes => bytes.fill(255)), errorIs('random'))
})

test('the full constrained password space is sampled one-to-one, including short passwords', () => {
  const small: PasswordOptions = { ...standard, length: 4, numbers: false, symbols: false, excludeCharacters: 'bcdefghijklmnopqrstuvwxyzBCDEFGHIJKLMNOPQRSTUVWXYZ' }
  const values = Array.from({ length: 14 }, (_, rank) => generateSecrets(small, 1, [], bytes => bytes.fill(rank)).values[0])
  assert.equal(new Set(values).size, 14)
  assert(values.every(value => value.length === 4 && value.includes('a') && value.includes('A')))
  assert.equal(getGeneratorInfo(small).entropyBits, Math.log2(14))
  assert.equal(getGeneratorInfo({ ...small, requireEachGroup: false }).entropyBits, 4)
})

test('passwords preserve length, group guarantees and all exclusions in a batch', () => {
  const config = { ...standard, length: 32, excludeSimilar: true, excludeAmbiguous: true, excludeCharacters: 'abcXYZ#$', customSymbols: '!@#$%^&*()_+' }
  const forbidden = new Set(SIMILAR_CHARACTERS + AMBIGUOUS_CHARACTERS + config.excludeCharacters)
  const result = generateSecrets(config, 50)
  assert.equal(result.values.length, 50)
  result.values.forEach(value => {
    assert.equal(value.length, 32)
    assert.match(value, /[a-z]/)
    assert.match(value, /[A-Z]/)
    assert.match(value, /[0-9]/)
    assert.match(value, /[!@%^&*_+]/)
    assert([...value].every(char => !forbidden.has(char)))
  })
  assert.equal(generateSecrets({ ...standard, length: 128 }).values[0].length, 128)
  assert(getGeneratorInfo({ ...standard, length: 128 }).entropyBits > 800)
})

test('custom symbol duplicates do not bias the pool', () => {
  const config: PasswordOptions = { ...standard, lowercase: false, uppercase: false, numbers: false, customSymbols: '!!!@@', length: 4 }
  assert.equal(getGeneratorInfo(config).poolSize, 2)
  assert.equal(getGeneratorInfo(config).entropyBits, 4)
})

test('invalid configurations fail explicitly without falling back to weaker output', () => {
  assert.throws(() => generateSecrets({ ...standard, lowercase: false, uppercase: false, numbers: false, symbols: false }), errorIs('groups'))
  assert.throws(() => generateSecrets({ ...standard, excludeCharacters: '0123456789' }), errorIs('emptyGroup'))
  for (const length of [0, 3, 129, 10.2, NaN, Infinity]) assert.throws(() => generateSecrets({ ...standard, length }), errorIs('length'))
  for (const quantity of [0, 51, 1.5, NaN]) assert.throws(() => generateSecrets(standard, quantity), errorIs('batch'))
  for (const customSymbols of ['', ' abc', 'é', 'a!']) assert.throws(() => generateSecrets({ ...standard, customSymbols }), errorIs('symbols'))
  assert.throws(() => generateSecrets({ ...standard, excludeCharacters: 'a'.repeat(257) }), errorIs('exclusions'))
})

test('the complete EFF wordlist is used and fixed formatting adds no claimed entropy', () => {
  assert.equal(effWords.length, 7776)
  assert.equal(new Set(effWords).size, 7776)
  const config = { mode: 'passphrase' as const, wordCount: 6, separator: ' ' as const, capitalize: false, appendNumber: false }
  const plain = generateSecrets(config, 8, effWords)
  plain.values.forEach(value => {
    const words = value.split(' ')
    assert.equal(words.length, 6)
    assert(words.every(word => effWords.includes(word)))
  })
  assert(Math.abs(plain.entropyBits - 6 * Math.log2(7776)) < 1e-10)
  const capitals = getGeneratorInfo({ ...config, capitalize: true, separator: '_' }, effWords)
  assert.equal(capitals.entropyBits, plain.entropyBits)
  const numbered = generateSecrets({ ...config, capitalize: true, appendNumber: true }, 1, effWords)
  assert.match(numbered.values[0], /^(?:[A-Z][a-z-]+ ){6}\d{2}$/)
  assert(Math.abs(numbered.entropyBits - plain.entropyBits - Math.log2(100)) < 1e-10)
  assert.throws(() => generateSecrets(config, 1, ['small', 'dictionary']), errorIs('words'))
  assert.throws(() => generateSecrets({ ...config, separator: '' as ' ' }, 1, effWords), errorIs('separator'))
})

test('PINs preserve leading zeros and honor the non-zero first digit option', () => {
  const withZero = generateSecrets({ mode: 'pin', length: 6, allowLeadingZero: true }, 1, [], bytes => bytes.fill(0))
  assert.equal(withZero.values[0], '000000')
  const withoutZero = generateSecrets({ mode: 'pin', length: 6, allowLeadingZero: false }, 1, [], bytes => bytes.fill(0))
  assert.equal(withoutZero.values[0], '100000')
  assert(Math.abs(withZero.entropyBits - Math.log2(1_000_000)) < 1e-10)
  assert(Math.abs(withoutZero.entropyBits - Math.log2(900_000)) < 1e-10)
})
