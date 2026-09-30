import type { Language } from './format'

export type NumerologyNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33
export type NumerologyKey = 'lifePath' | 'birthday' | 'attitude' | 'personalYear'
export type NumerologyMeaning = { color: string; tr: { title: string; description: string }; en: { title: string; description: string }; ru: { title: string; description: string } }

export const NUMEROLOGY_MEANINGS: Readonly<Record<NumerologyNumber, NumerologyMeaning>> = {
  1: { color: '#5b7fe8', tr: { title: 'Başlangıç', description: 'Bağımsızlık, irade ve yeni adımlar.' }, en: { title: 'Beginnings', description: 'Independence, will and new beginnings.' }, ru: { title: 'Начало', description: 'Независимость, воля и новые шаги.' } },
  2: { color: '#6ab99e', tr: { title: 'Uyum', description: 'İş birliği, sezgi ve denge.' }, en: { title: 'Harmony', description: 'Cooperation, intuition and balance.' }, ru: { title: 'Гармония', description: 'Сотрудничество, интуиция и равновесие.' } },
  3: { color: '#e5a648', tr: { title: 'İfade', description: 'Yaratıcılık, iletişim ve neşe.' }, en: { title: 'Expression', description: 'Creativity, communication and joy.' }, ru: { title: 'Выражение', description: 'Творчество, общение и радость.' } },
  4: { color: '#8e78d8', tr: { title: 'Yapı', description: 'Düzen, emek ve güvenilirlik.' }, en: { title: 'Structure', description: 'Structure, effort and reliability.' }, ru: { title: 'Структура', description: 'Порядок, труд и надёжность.' } },
  5: { color: '#df7590', tr: { title: 'Özgürlük', description: 'Değişim, merak ve hareket.' }, en: { title: 'Freedom', description: 'Change, curiosity and movement.' }, ru: { title: 'Свобода', description: 'Перемены, любопытство и движение.' } },
  6: { color: '#60a8d0', tr: { title: 'Sorumluluk', description: 'Bakım, bağ ve estetik.' }, en: { title: 'Responsibility', description: 'Care, connection and aesthetics.' }, ru: { title: 'Ответственность', description: 'Забота, связь и эстетика.' } },
  7: { color: '#9a78be', tr: { title: 'Derinlik', description: 'Araştırma, içgörü ve anlam arayışı.' }, en: { title: 'Depth', description: 'Research, insight and a search for meaning.' }, ru: { title: 'Глубина', description: 'Исследование, проницательность и поиск смысла.' } },
  8: { color: '#d47e51', tr: { title: 'Güç', description: 'Hedef, yönetim ve sonuç alma.' }, en: { title: 'Power', description: 'Goals, management and results.' }, ru: { title: 'Сила', description: 'Цели, управление и результат.' } },
  9: { color: '#5ba58c', tr: { title: 'Bütünlük', description: 'Merhamet, idealizm ve tamamlanma.' }, en: { title: 'Wholeness', description: 'Compassion, idealism and completion.' }, ru: { title: 'Целостность', description: 'Сострадание, идеализм и завершение.' } },
  11: { color: '#718ee3', tr: { title: 'İlham', description: 'Sezgi, vizyon ve farkındalık.' }, en: { title: 'Inspiration', description: 'Intuition, vision and awareness.' }, ru: { title: 'Вдохновение', description: 'Интуиция, видение и осознанность.' } },
  22: { color: '#597bcf', tr: { title: 'Kurucu', description: 'Büyük fikirleri somutlaştırma.' }, en: { title: 'Builder', description: 'Turning big ideas into something tangible.' }, ru: { title: 'Созидатель', description: 'Воплощение больших идей.' } },
  33: { color: '#d789ae', tr: { title: 'Şefkat', description: 'Öğretme, iyileştirme ve hizmet.' }, en: { title: 'Compassion', description: 'Teaching, healing and service.' }, ru: { title: 'Сострадание', description: 'Обучение, исцеление и служение.' } },
}

export const NUMEROLOGY_LABELS: Readonly<Record<NumerologyKey, Record<Language, string>>> = {
  lifePath: { tr: 'Yaşam yolu', en: 'Life path', ru: 'Жизненный путь' },
  birthday: { tr: 'Doğum günü', en: 'Birthday', ru: 'День рождения' },
  attitude: { tr: 'Tutum', en: 'Attitude', ru: 'Число отношения' },
  personalYear: { tr: 'Kişisel yıl', en: 'Personal year', ru: 'Личный год' },
}

export type NumerologyScore = { key: NumerologyKey; value: number; display: NumerologyNumber; color: string }
export type NumerologyResult = {
  lifePath: NumerologyNumber
  birthday: NumerologyNumber
  attitude: NumerologyNumber
  personalYear: NumerologyNumber
  year: number
  rawLifePath: number
  scores: NumerologyScore[]
}

function digitSum(value: number) {
  return String(value).split('').reduce((sum, digit) => sum + Number(digit), 0)
}

/** Reduces to a single digit while preserving the master numbers 11, 22 and 33. */
export function reduceNumber(value: number, keepMaster = true): NumerologyNumber {
  let current = Math.abs(Math.trunc(value))
  while (current > 9 && !(keepMaster && (current === 11 || current === 22 || current === 33))) current = digitSum(current)
  return current as NumerologyNumber
}

/** Collapses a master number to its single-digit position on a 1–9 wheel. */
export function wheelPosition(value: NumerologyNumber) {
  return value > 9 ? digitSum(value) : value
}

export function numerologyFromDate(date: string, today = new Date()): NumerologyResult {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) throw new Error('Invalid date')
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText), month = Number(monthText), day = Number(dayText)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) throw new Error('Invalid date')
  const rawLifePath = digitSum(Number(`${yearText}${monthText}${dayText}`))
  const lifePath = reduceNumber(reduceNumber(day) + reduceNumber(month) + reduceNumber(year))
  const birthday = reduceNumber(day)
  const attitude = reduceNumber(day + month)
  const currentYear = today.getFullYear()
  const personalYear = reduceNumber(day + month + currentYear)
  const score = (key: NumerologyKey, display: NumerologyNumber): NumerologyScore => ({ key, value: Number(display), display, color: NUMEROLOGY_MEANINGS[display].color })
  return { lifePath, birthday, attitude, personalYear, year: currentYear, rawLifePath, scores: [score('lifePath', lifePath), score('birthday', birthday), score('attitude', attitude), score('personalYear', personalYear)] }
}

export function numerologyMeaning(value: NumerologyNumber, language: Language) {
  const meaning = NUMEROLOGY_MEANINGS[value]
  return { ...meaning[language], color: meaning.color }
}

/** Pythagorean letter values; Turkish letters map to their base Latin letter. */
const LETTER_VALUES: Readonly<Record<string, number>> = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9, s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8 }
const TURKISH_MAP: Readonly<Record<string, string>> = { ç: 'c', ğ: 'g', ı: 'i', i̇: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }
/** Cyrillic names are transliterated so their letters can take Pythagorean values. */
const CYRILLIC_MAP: Readonly<Record<string, string>> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', є: 'ye', і: 'i', ї: 'yi', ґ: 'g' }
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

export function normalizeName(name: string) {
  return [...name.toLocaleLowerCase('tr')].map((char) => TURKISH_MAP[char] ?? CYRILLIC_MAP[char] ?? char).join('').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')
}

export type NameNumerology = { expression: NumerologyNumber; soulUrge: NumerologyNumber; personality: NumerologyNumber; letters: number; expressionSum: number; soulUrgeSum: number; personalitySum: number }

/** Expression (all letters), soul urge (vowels) and personality (consonants) numbers, or null for an empty name. */
export function numerologyFromName(name: string): NameNumerology | null {
  const letters = normalizeName(name)
  if (!letters) return null
  const sum = (predicate: (char: string) => boolean) => [...letters].filter(predicate).reduce((total, char) => total + (LETTER_VALUES[char] ?? 0), 0)
  const expressionSum = sum(() => true), soulUrgeSum = sum((char) => VOWELS.has(char)), personalitySum = sum((char) => !VOWELS.has(char))
  return { expression: reduceNumber(expressionSum), soulUrge: reduceNumber(soulUrgeSum), personality: reduceNumber(personalitySum), letters: letters.length, expressionSum, soulUrgeSum, personalitySum }
}

export type PersonalCycle = { year: NumerologyNumber; month: NumerologyNumber; day: NumerologyNumber; calendarYear: number; calendarMonth: number; calendarDay: number }

/** Personal year, month and day for a given calendar date. */
export function personalCycle(birthDate: string, today = new Date()): PersonalCycle {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!match) throw new Error('Invalid date')
  const day = Number(match[3]), month = Number(match[2])
  const calendarYear = today.getFullYear(), calendarMonth = today.getMonth() + 1, calendarDay = today.getDate()
  const year = reduceNumber(day + month + calendarYear)
  const monthNumber = reduceNumber(Number(year) + calendarMonth)
  const dayNumber = reduceNumber(Number(monthNumber) + calendarDay)
  return { year, month: monthNumber, day: dayNumber, calendarYear, calendarMonth, calendarDay }
}

export function maturityNumber(lifePath: NumerologyNumber, expression: NumerologyNumber) {
  return reduceNumber(Number(lifePath) + Number(expression))
}

/** Human-readable reduction trail, e.g. "29 → 11" or "35 → 8". */
export function reductionTrail(value: number, keepMaster = true): string {
  const steps = [value]
  let current = Math.abs(Math.trunc(value))
  while (current > 9 && !(keepMaster && (current === 11 || current === 22 || current === 33))) { current = digitSum(current); steps.push(current) }
  return steps.join(' → ')
}
