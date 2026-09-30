#!/usr/bin/env node
/**
 * Refreshes the bundled monthly economic series.
 *
 *   node scripts/build-economic-data.mjs            # regenerate src/lib/generated/series.ts from src/data/*.csv
 *   node scripts/build-economic-data.mjs --download # download fresh CSVs first (FRED + World Bank), then regenerate
 *
 * Sources need no API key. Every CSV in src/data is normalised to "date,value" rows so the
 * generated module stays reproducible and reviewable in diffs.
 *
 * A series can name an `extend` source: when the main provider stops publishing (the OECD MEI
 * indices ended in spring 2025), the month-over-month changes of the fresher index are chained
 * onto the last published level, so the full history stays and the series still reaches today.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = resolve(ROOT, 'src/data')
const OUTPUT = resolve(ROOT, 'src/lib/generated/series.ts')
const FRED = (id, extra = '') => `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}${extra}`
const ONS = (cdid, dataset) => `https://www.ons.gov.uk/generator?format=csv&uri=/economy/inflationandpriceindices/timeseries/${cdid}/${dataset}`
const WORLD_BANK_MONTHLY = 'https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx'

const SERIES = [
  { id: 'cpi-us', file: 'cpi-us.csv', url: FRED('CPIAUCNS'), page: 'https://fred.stlouisfed.org/series/CPIAUCNS', source: 'U.S. Bureau of Labor Statistics via FRED (CPIAUCNS)', unit: 'CPI-U index, 1982-84=100, not seasonally adjusted' },
  { id: 'cpi-tr', file: 'cpi-tr.csv', url: FRED('TURCPIALLMINMEI'), page: 'https://fred.stlouisfed.org/series/TURCPIALLMINMEI', source: 'OECD Main Economic Indicators via FRED (TURCPIALLMINMEI)', unit: 'CPI all items index, 2015=100', extend: { file: 'cpi-tr-hicp.csv', url: FRED('CP0000TRM086NEST'), source: 'Eurostat HICP via FRED (CP0000TRM086NEST)' } },
  { id: 'cpi-gb', file: 'cpi-gb.csv', url: FRED('GBRCPIALLMINMEI'), page: 'https://fred.stlouisfed.org/series/GBRCPIALLMINMEI', source: 'OECD Main Economic Indicators via FRED (GBRCPIALLMINMEI)', unit: 'CPI all items index, 2015=100', extend: { file: 'cpi-gb-ons.csv', url: ONS('d7bt', 'mm23'), source: 'ONS CPI index (D7BT, dataset MM23)', kind: 'ons' } },
  { id: 'cpi-de', file: 'cpi-de.csv', url: FRED('DEUCPIALLMINMEI'), page: 'https://fred.stlouisfed.org/series/DEUCPIALLMINMEI', source: 'OECD Main Economic Indicators via FRED (DEUCPIALLMINMEI)', unit: 'CPI all items index, 2015=100', extend: { file: 'cpi-de-hicp.csv', url: FRED('CP0000DEM086NEST'), source: 'Eurostat HICP via FRED (CP0000DEM086NEST)' } },
  { id: 'usd-try', file: 'usd-try.csv', url: FRED('CCUSMA02TRM618N'), page: 'https://fred.stlouisfed.org/series/CCUSMA02TRM618N', source: 'OECD via FRED (CCUSMA02TRM618N)', unit: 'TRY per USD, monthly average' },
  { id: 'eur-usd', file: 'eur-usd.csv', url: FRED('EXUSEU'), page: 'https://fred.stlouisfed.org/series/EXUSEU', source: 'Federal Reserve H.10 via FRED (EXUSEU)', unit: 'USD per EUR, monthly average' },
  { id: 'gbp-usd', file: 'gbp-usd.csv', url: FRED('EXUSUK'), page: 'https://fred.stlouisfed.org/series/EXUSUK', source: 'Federal Reserve H.10 via FRED (EXUSUK)', unit: 'USD per GBP, monthly average' },
  { id: 'jpy-usd', file: 'jpy-usd.csv', url: FRED('EXJPUS'), page: 'https://fred.stlouisfed.org/series/EXJPUS', source: 'Federal Reserve H.10 via FRED (EXJPUS)', unit: 'JPY per USD, monthly average' },
  { id: 'inr-usd', file: 'inr-usd.csv', url: FRED('EXINUS'), page: 'https://fred.stlouisfed.org/series/EXINUS', source: 'Federal Reserve H.10 via FRED (EXINUS)', unit: 'INR per USD, monthly average' },
  { id: 'cny-usd', file: 'cny-usd.csv', url: FRED('EXCHUS'), page: 'https://fred.stlouisfed.org/series/EXCHUS', source: 'Federal Reserve H.10 via FRED (EXCHUS)', unit: 'CNY per USD, monthly average' },
  { id: 'chf-usd', file: 'chf-usd.csv', url: FRED('EXSZUS'), page: 'https://fred.stlouisfed.org/series/EXSZUS', source: 'Federal Reserve H.10 via FRED (EXSZUS)', unit: 'CHF per USD, monthly average' },
  { id: 'cad-usd', file: 'cad-usd.csv', url: FRED('EXCAUS'), page: 'https://fred.stlouisfed.org/series/EXCAUS', source: 'Federal Reserve H.10 via FRED (EXCAUS)', unit: 'CAD per USD, monthly average' },
  { id: 'aud-usd', file: 'aud-usd.csv', url: FRED('EXUSAL'), page: 'https://fred.stlouisfed.org/series/EXUSAL', source: 'Federal Reserve H.10 via FRED (EXUSAL)', unit: 'USD per AUD, monthly average' },
  { id: 'nasdaq', file: 'nasdaq.csv', url: FRED('NASDAQCOM', '&fq=Monthly&fam=avg'), page: 'https://fred.stlouisfed.org/series/NASDAQCOM', source: 'NASDAQ OMX Group via FRED (NASDAQCOM), monthly average of daily closes', unit: 'index points' },
  { id: 'try-rate', file: 'try-rate.csv', url: FRED('IRSTCI01TRM156N'), page: 'https://fred.stlouisfed.org/series/IRSTCI01TRM156N', source: 'OECD via FRED (IRSTCI01TRM156N), Turkish overnight interbank rate', unit: 'percent per year, monthly average' },
  { id: 'gold-usd', file: 'gold-usd.csv', url: WORLD_BANK_MONTHLY, page: 'https://www.worldbank.org/en/research/commodity-markets', source: 'World Bank Commodity Price Data (Pink Sheet), gold, CC BY 4.0', unit: 'USD per troy ounce, monthly average', kind: 'world-bank-gold' },
]

async function download(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'tools.mucahid.dev data refresh' } })
  if (!response.ok) throw new Error(`${url} responded ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

/** Minimal zip reader (central directory + raw deflate); enough for an .xlsx workbook. */
function zipReader(buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (end < 0) throw new Error('Not a zip archive')
  const count = buffer.readUInt16LE(end + 10)
  let offset = buffer.readUInt32LE(end + 16)
  const entries = new Map()
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Corrupt central directory')
    const method = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const nameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localOffset = buffer.readUInt32LE(offset + 42)
    entries.set(buffer.toString('utf8', offset + 46, offset + 46 + nameLength), { method, compressedSize, localOffset })
    offset += 46 + nameLength + extraLength + commentLength
  }
  return (name) => {
    const entry = entries.get(name)
    if (!entry) throw new Error(`${name} is missing from the workbook`)
    const start = entry.localOffset + 30 + buffer.readUInt16LE(entry.localOffset + 26) + buffer.readUInt16LE(entry.localOffset + 28)
    const data = buffer.subarray(start, start + entry.compressedSize)
    return (entry.method === 8 ? inflateRawSync(data) : data).toString('utf8')
  }
}

const decodeXml = (text) => text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")

/** Extracts the monthly gold price column from the World Bank "Monthly Prices" sheet. */
function worldBankGoldCsv(workbook) {
  const read = zipReader(workbook)
  const sheetId = /<sheet[^>]*name="Monthly Prices"[^>]*r:id="([^"]+)"/.exec(read('xl/workbook.xml'))?.[1]
  const target = new RegExp(`Id="${sheetId}"[^>]*Target="([^"]+)"`).exec(read('xl/_rels/workbook.xml.rels'))?.[1] ?? new RegExp(`Target="([^"]+)"[^>]*Id="${sheetId}"`).exec(read('xl/_rels/workbook.xml.rels'))?.[1]
  if (!sheetId || !target) throw new Error('Monthly Prices sheet not found')
  const shared = [...read('xl/sharedStrings.xml').matchAll(/<si>(.*?)<\/si>/gs)].map((match) => decodeXml([...match[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((t) => t[1]).join('')))
  const rows = [...read(`xl/${target.replace(/^\/?xl\//, '')}`).matchAll(/<row [^>]*>(.*?)<\/row>/gs)].map((row) => {
    const cells = {}
    for (const cell of row[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) {
      const [, column, attributes, inner = ''] = cell
      const value = /<v>(.*?)<\/v>/s.exec(inner)?.[1]
      if (value === undefined) continue
      cells[column] = /t="s"/.test(attributes) ? shared[Number(value)] : value
    }
    return cells
  })
  const headerIndex = rows.findIndex((row) => Object.values(row).some((value) => /^gold$/i.test(String(value).trim())))
  if (headerIndex < 0) throw new Error('Gold column not found')
  const column = Object.entries(rows[headerIndex]).find(([, value]) => /^gold$/i.test(String(value).trim()))[0]
  const lines = rows.slice(headerIndex + 1).flatMap((row) => {
    const label = String(row.A ?? '')
    const match = /^(\d{4})M(\d{2})$/.exec(label)
    if (!match || row[column] === undefined || !Number.isFinite(Number(row[column]))) return []
    return [`${match[1]}-${match[2]}-01,${row[column]}`]
  })
  if (lines.length < 600) throw new Error(`Unexpectedly short gold series (${lines.length} rows)`)
  return `date,value\n${lines.join('\n')}\n`
}

function normaliseCsv(text) {
  const rows = text.trim().split(/\r?\n/).slice(1).map((line) => line.split(','))
  const lines = rows.filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date)).map(([date, value]) => `${date},${value === undefined || value === '' || value === '.' ? '' : value}`)
  if (lines.length === 0) throw new Error('CSV contained no observations')
  return `date,value\n${lines.join('\n')}\n`
}

const ONS_MONTHS = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' }

/** ONS time-series CSVs mix annual, quarterly and monthly rows after a metadata header; only the monthly rows are kept. */
function onsCsv(text) {
  const lines = []
  for (const line of text.split(/\r?\n/)) {
    const match = /^"(\d{4}) ([A-Z]{3})","([-\d.]+)"/.exec(line)
    if (match && ONS_MONTHS[match[2]]) lines.push(`${match[1]}-${ONS_MONTHS[match[2]]}-01,${match[3]}`)
  }
  if (lines.length === 0) throw new Error('ONS CSV contained no monthly rows')
  return `date,value\n${lines.join('\n')}\n`
}

const monthNumber = (start, offset) => { const [year, month] = start.split('-').map(Number); return year * 12 + (month - 1) + offset }
const monthLabel = (absolute) => `${Math.floor(absolute / 12)}-${String((absolute % 12) + 1).padStart(2, '0')}`

/**
 * Chains the month-over-month changes of a fresher index onto the last published level of the base index.
 * Stops at the first month the extension has not published. Returns null when nothing could be added.
 */
function splice(base, extension) {
  const baseEnd = base.values.findLastIndex((value) => value !== null)
  if (baseEnd < 0) return null
  const extensionAt = (absolute) => { const index = absolute - monthNumber(extension.start, 0); return index >= 0 && index < extension.values.length ? extension.values[index] : null }
  const values = base.values.slice(0, baseEnd + 1)
  let absolute = monthNumber(base.start, baseEnd)
  let level = values[baseEnd]
  for (;;) {
    const previous = extensionAt(absolute), next = extensionAt(absolute + 1)
    if (previous === null || next === null || previous <= 0) break
    level = Number((level * (next / previous)).toPrecision(9))
    values.push(level)
    absolute += 1
  }
  const added = values.length - baseEnd - 1
  return added > 0 ? { values, from: monthLabel(monthNumber(base.start, baseEnd + 1)), added } : null
}

function compact(csv) {
  const rows = csv.trim().split(/\r?\n/).slice(1).map((line) => line.split(','))
  const first = rows[0][0].slice(0, 7)
  const last = rows.at(-1)[0].slice(0, 7)
  const [firstYear, firstMonth] = first.split('-').map(Number)
  const [lastYear, lastMonth] = last.split('-').map(Number)
  const length = (lastYear - firstYear) * 12 + (lastMonth - firstMonth) + 1
  const values = Array.from({ length }, () => null)
  for (const [date, raw] of rows) {
    const [year, month] = date.split('-').map(Number)
    const index = (year - firstYear) * 12 + (month - firstMonth)
    const value = Number(raw)
    if (raw !== '' && Number.isFinite(value)) values[index] = Number(value.toPrecision(9))
  }
  return { start: first, values }
}

async function main() {
  const shouldDownload = process.argv.includes('--download')
  mkdirSync(DATA_DIR, { recursive: true })
  if (shouldDownload) {
    for (const series of SERIES) {
      process.stdout.write(`Downloading ${series.id} … `)
      const body = await download(series.url)
      const csv = series.kind === 'world-bank-gold' ? worldBankGoldCsv(body) : normaliseCsv(body.toString('utf8'))
      writeFileSync(resolve(DATA_DIR, series.file), csv)
      console.log(`${csv.trim().split('\n').length - 1} rows`)
      if (series.extend) {
        process.stdout.write(`Downloading ${series.id} extension … `)
        const extensionBody = (await download(series.extend.url)).toString('utf8')
        const extensionCsv = series.extend.kind === 'ons' ? onsCsv(extensionBody) : normaliseCsv(extensionBody)
        writeFileSync(resolve(DATA_DIR, series.extend.file), extensionCsv)
        console.log(`${extensionCsv.trim().split('\n').length - 1} rows`)
      }
    }
  }
  const generatedAt = new Date().toISOString().slice(0, 10)
  const entries = SERIES.map((series) => {
    const base = compact(readFileSync(resolve(DATA_DIR, series.file), 'utf8'))
    let { values } = base
    let source = series.source
    if (series.extend) {
      const spliced = splice(base, compact(readFileSync(resolve(DATA_DIR, series.extend.file), 'utf8')))
      if (spliced) {
        values = spliced.values
        source = `${series.source}; from ${spliced.from} extended with the month-over-month changes of ${series.extend.source}`
        console.log(`${series.id}: ${spliced.added} months chained from ${series.extend.source} (from ${spliced.from})`)
      } else console.warn(`${series.id}: extension added nothing`)
    }
    return `  '${series.id}': { id: '${series.id}', start: '${base.start}', unit: ${JSON.stringify(series.unit)}, source: ${JSON.stringify(source)}, url: ${JSON.stringify(series.page)}, values: ${JSON.stringify(values)} },`
  })
  const output = [
    `/* Generated by scripts/build-economic-data.mjs on ${generatedAt}. Do not edit by hand; see src/data/SOURCES.md. */`,
    `export type SeriesId = ${SERIES.map((series) => `'${series.id}'`).join(' | ')}`,
    `/** Consecutive months from \`start\` (YYYY-MM); \`null\` marks a month the provider did not publish. */`,
    `export type MonthlySeries = { id: SeriesId; start: string; unit: string; source: string; url: string; values: (number | null)[] }`,
    `export const DATA_GENERATED_AT = '${generatedAt}'`,
    `export const SERIES: Record<SeriesId, MonthlySeries> = {`,
    ...entries,
    `}`,
    '',
  ].join('\n')
  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, output)
  console.log(`Wrote ${OUTPUT}`)
}

main().catch((error) => { console.error(error); process.exit(1) })
