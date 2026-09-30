/** Local password generation. No persistence, telemetry, or network requests. */
export const DEFAULT_SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?'
export const SIMILAR_CHARACTERS = 'iIlL1oO0'
export const AMBIGUOUS_CHARACTERS = '{}[]()/\\\'"`~,;:.<>'
export const PASSPHRASE_SOURCE = 'https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt'

export type PasswordOptions = {
  mode: 'password'; length: number; lowercase: boolean; uppercase: boolean
  numbers: boolean; symbols: boolean; requireEachGroup: boolean
  excludeSimilar: boolean; excludeAmbiguous: boolean; excludeCharacters: string; customSymbols: string
}
export type PassphraseOptions = {
  mode: 'passphrase'; wordCount: number; separator: ' ' | '-' | '_' | '.'
  capitalize: boolean; appendNumber: boolean
}
export type PinOptions = { mode: 'pin'; length: number; allowLeadingZero: boolean }
export type GeneratorOptions = PasswordOptions | PassphraseOptions | PinOptions
export type RandomBytes = (bytes: Uint8Array) => void
export type GeneratorErrorCode = 'length' | 'groups' | 'emptyGroup' | 'symbols' | 'exclusions' | 'batch' | 'words' | 'separator' | 'random'

export class GeneratorError extends Error {
  constructor(public readonly code: GeneratorErrorCode) { super(code); this.name = 'GeneratorError' }
}

const ZERO = BigInt(0), ONE = BigInt(1), EIGHT = BigInt(8)
const webCryptoBytes: RandomBytes = bytes => {
  if (!globalThis.crypto?.getRandomValues) throw new GeneratorError('random')
  globalThis.crypto.getRandomValues(bytes)
}

/** Rejection sampling avoids the modulo bias of random % limit. */
export function randomBelow(limit: bigint, randomBytes: RandomBytes = webCryptoBytes): bigint {
  if (limit < ONE) throw new RangeError('The limit must be positive.')
  if (limit === ONE) return ZERO
  const bits = (limit - ONE).toString(2).length
  const bytes = new Uint8Array(Math.ceil(bits / 8))
  const mask = 255 >>> (bytes.length * 8 - bits)
  for (let attempt = 0; attempt < 1024; attempt++) {
    randomBytes(bytes)
    bytes[0] &= mask
    let value = ZERO
    for (const byte of bytes) value = (value << EIGHT) | BigInt(byte)
    if (value < limit) return value
  }
  throw new GeneratorError('random')
}

function integerInRange(value: number, min: number, max: number, error: GeneratorErrorCode) {
  if (!Number.isInteger(value) || value < min || value > max) throw new GeneratorError(error)
}

function log2BigInt(value: bigint): number {
  const bits = value.toString(2).length
  const shift = Math.max(0, bits - 52)
  return Math.log2(Number(value >> BigInt(shift))) + shift
}

function characterGroups(options: PasswordOptions): string[][] {
  if (options.excludeCharacters.length > 256) throw new GeneratorError('exclusions')
  const symbols = [...new Set(options.customSymbols)]
  if (options.symbols && (symbols.length === 0 || symbols.some(char => {
    const code = char.charCodeAt(0)
    return code < 33 || code > 126 || /[a-zA-Z0-9]/.test(char)
  }))) throw new GeneratorError('symbols')
  const excluded = new Set(options.excludeCharacters + (options.excludeSimilar ? SIMILAR_CHARACTERS : '') + (options.excludeAmbiguous ? AMBIGUOUS_CHARACTERS : ''))
  const groups = [
    options.lowercase ? 'abcdefghijklmnopqrstuvwxyz' : null,
    options.uppercase ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : null,
    options.numbers ? '0123456789' : null,
    options.symbols ? symbols.join('') : null,
  ].filter((group): group is string => group !== null).map(group => [...group].filter(char => !excluded.has(char)))
  if (!groups.length) throw new GeneratorError('groups')
  if (groups.some(group => group.length === 0)) throw new GeneratorError('emptyGroup')
  return groups
}

type GeneratorModel = { combinations: bigint; poolSize: number; sample: (randomBytes?: RandomBytes) => string }

function passwordModel(options: PasswordOptions): GeneratorModel {
  integerInRange(options.length, 4, 128, 'length')
  const groups = characterGroups(options)
  const initialMissing = options.requireEachGroup ? (1 << groups.length) - 1 : 0
  const memo = new Map<string, bigint>()
  // Count all valid suffixes. Uniformly unranking this space preserves equal
  // probability even when every enabled character group must be represented.
  function count(remaining: number, missing: number): bigint {
    if (remaining === 0) return missing === 0 ? ONE : ZERO
    const key = `${remaining}:${missing}`
    const cached = memo.get(key)
    if (cached !== undefined) return cached
    let result = ZERO
    groups.forEach((group, index) => { result += BigInt(group.length) * count(remaining - 1, missing & ~(1 << index)) })
    memo.set(key, result)
    return result
  }
  const combinations = count(options.length, initialMissing)
  return {
    combinations, poolSize: groups.reduce((sum, group) => sum + group.length, 0),
    sample(randomBytes) {
      let rank = randomBelow(combinations, randomBytes), missing = initialMissing, result = ''
      for (let remaining = options.length; remaining > 0; remaining--) {
        for (let index = 0; index < groups.length; index++) {
          const nextMissing = missing & ~(1 << index)
          const suffixes = count(remaining - 1, nextMissing)
          const blockSize = BigInt(groups[index].length) * suffixes
          if (rank >= blockSize) { rank -= blockSize; continue }
          result += groups[index][Number(rank / suffixes)]
          rank %= suffixes
          missing = nextMissing
          break
        }
      }
      return result
    },
  }
}

function passphraseModel(options: PassphraseOptions, words: readonly string[]): GeneratorModel {
  integerInRange(options.wordCount, 4, 12, 'length')
  if (![' ', '-', '_', '.'].includes(options.separator)) throw new GeneratorError('separator')
  // Only the bundled, complete EFF-sized wordlist is accepted. A tiny fallback
  // dictionary would create misleading entropy and weaker results.
  if (words.length !== 7776 || new Set(words).size !== 7776 || words.some(word => !/^[a-z]+(?:-[a-z]+)?$/.test(word))) throw new GeneratorError('words')
  const size = BigInt(words.length)
  return {
    combinations: size ** BigInt(options.wordCount) * (options.appendNumber ? BigInt(100) : ONE),
    poolSize: words.length,
    sample(randomBytes) {
      const chosen = Array.from({ length: options.wordCount }, () => {
        const word = words[Number(randomBelow(size, randomBytes))]
        return options.capitalize ? word[0].toUpperCase() + word.slice(1) : word
      })
      if (options.appendNumber) chosen.push(String(randomBelow(BigInt(100), randomBytes)).padStart(2, '0'))
      return chosen.join(options.separator)
    },
  }
}

function pinModel(options: PinOptions): GeneratorModel {
  integerInRange(options.length, 4, 12, 'length')
  const firstDigits = options.allowLeadingZero ? '0123456789' : '123456789'
  return {
    combinations: BigInt(firstDigits.length) * BigInt(10) ** BigInt(options.length - 1), poolSize: 10,
    sample(randomBytes) {
      let result = firstDigits[Number(randomBelow(BigInt(firstDigits.length), randomBytes))]
      for (let i = 1; i < options.length; i++) result += String(randomBelow(BigInt(10), randomBytes))
      return result
    },
  }
}

function modelFor(options: GeneratorOptions, words: readonly string[]) {
  if (options.mode === 'password') return passwordModel(options)
  if (options.mode === 'passphrase') return passphraseModel(options, words)
  return pinModel(options)
}

export function getGeneratorInfo(options: GeneratorOptions, words: readonly string[] = []) {
  const model = modelFor(options, words)
  return { entropyBits: log2BigInt(model.combinations), poolSize: model.poolSize }
}

export function generateSecrets(options: GeneratorOptions, quantity = 1, words: readonly string[] = [], randomBytes?: RandomBytes) {
  integerInRange(quantity, 1, 50, 'batch')
  const model = modelFor(options, words)
  return {
    values: Array.from({ length: quantity }, () => model.sample(randomBytes)),
    entropyBits: log2BigInt(model.combinations), poolSize: model.poolSize,
  }
}
