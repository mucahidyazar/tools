'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from '@/hooks/use-language'
import { formatMoney, formatNumber, formatPercent, monthName, type Language } from '@/lib/format'
import { adjustForInflation, annualInflation, availableYears, COUNTRY_CODES, COUNTRY_CURRENCY, COUNTRY_NAMES, dataCoverage, DATA_LAST_UPDATED, monthlyInflation, type CountryCode } from '@/lib/economic-data'
import { roi } from '@/lib/calculations'
import { DataTable, Disclosure, Field, Note, Panel, Result, Select, Stat } from './shared'
import type { MonthKey } from '@/lib/series'

export const countryLabels: Record<CountryCode, Record<Language, string>> = COUNTRY_NAMES
const countryOptions = (language: Language) => COUNTRY_CODES.map((code) => ({ value: code, label: countryLabels[code][language] }))
const monthKeyLabel = (key: MonthKey, language: Language) => `${monthName(key.month - 1, language)} ${key.year}`
const yearOptions = (years: number[]) => [...years].reverse().map((year) => ({ value: String(year), label: String(year) }))
const clampYear = (value: string, years: number[], fallback: number) => (years.includes(Number(value)) ? Number(value) : fallback)

function CoverageNote({ country }: { country: CountryCode }) {
  const { language, t } = useTranslation()
  const coverage = dataCoverage(country)
  if (!coverage) return null
  return <Note>{t('Veri kapsamı', 'Data coverage', 'Охват данных')}: {countryLabels[country][language]} · {monthKeyLabel(coverage.first, language)} – {monthKeyLabel(coverage.last, language)} · <a className="underline" href={coverage.url} target="_blank" rel="noreferrer">{coverage.source}</a> · {t('Paket güncelleme', 'Bundle updated', 'Данные обновлены')}: {DATA_LAST_UPDATED}. {t('Veriler cihazınızda işlenir; ağ isteği yapılmaz.', 'Data is processed on your device; no network request is made.', 'Данные обрабатываются на вашем устройстве; сетевые запросы не выполняются.')}</Note>
}

export function HistoricalTool() {
  const { language, t } = useTranslation()
  const [amount, setAmount] = useState('100')
  const [country, setCountry] = useState<CountryCode>('TR')
  const [fromYear, setFromYear] = useState('2000')
  const [toYear, setToYear] = useState('')
  const years = useMemo(() => availableYears(country), [country])
  const lastYear = years[years.length - 1]
  const from = clampYear(fromYear, years, years[0])
  const to = Math.max(from, clampYear(toYear, years, lastYear))
  const result = adjustForInflation(Number(amount) || 0, country, from, to)
  const currency = COUNTRY_CURRENCY[country]
  const money = (value: number) => formatMoney(value, language, currency, 2)
  const spanYears = result ? result.to.year - result.from.year : 0
  const averageAnnual = result && spanYears > 0 ? (result.factor ** (1 / spanYears) - 1) * 100 : 0
  const periodLabel = (period: { year: number; months: number; through: MonthKey }) => period.months === 12 ? `${period.year} ${t('yıllık ort.', 'annual avg.', 'среднегодовое')}` : `${period.year} (${t('Oca', 'Jan', 'янв')}–${monthName(period.through.month - 1, language)} ${t('ort.', 'avg.', 'ср.')})`
  return <Panel>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field name="amount" label={t('Tutar', 'Amount', 'Сумма')} value={amount} onChange={setAmount} suffix={currency} min="0" />
      <Select name="country" label={t('Ülke', 'Country', 'Страна')} value={country} onChange={(value) => setCountry(value as CountryCode)} options={countryOptions(language)} />
      <Select name="fromYear" label={t('Başlangıç yılı', 'From year', 'Год начала')} value={String(from)} onChange={setFromYear} options={yearOptions(years)} />
      <Select name="toYear" label={t('Hedef yıl', 'To year', 'Год окончания')} value={String(to)} onChange={setToYear} options={yearOptions(years.filter((year) => year >= from))} />
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Result label={t(`${from} yılındaki ${money(Number(amount) || 0)} bugün`, `${money(Number(amount) || 0)} in ${from} is worth`, `${money(Number(amount) || 0)} в ${from} году сегодня стоят`)} value={result ? money(result.value) : t('Veri yok', 'No data', 'Нет данных')} detail={result ? `${periodLabel(result.from)} → ${periodLabel(result.to)}` : t('Seçilen yıllar için endeks verisi bulunmuyor.', 'No index data for the selected years.', 'Нет данных индекса для выбранных лет.')} />
      <div className="grid grid-cols-2 gap-3">
        <Stat label={t('Fiyat düzeyi', 'Price level', 'Уровень цен')} value={result ? `×${formatNumber(result.factor, language, { maximumFractionDigits: 2 })}` : '—'} detail={t('katına çıktı', 'times higher', 'раз выше')} />
        <Stat label={t('Yıllık ort. enflasyon', 'Avg. annual inflation', 'Ср. годовая инфляция')} value={spanYears > 0 ? formatPercent(averageAnnual, language, 1) : '—'} detail={spanYears > 0 ? `${spanYears} ${t('yıl', 'years', 'лет')}` : undefined} />
        <Stat label={t('Alım gücü kaybı', 'Purchasing-power loss', 'Потеря покупательной способности')} value={result && result.factor > 0 ? formatPercent((1 - 1 / result.factor) * 100, language, 1) : '—'} tone="negative" detail={t(`${from} parasının değeri`, `of the ${from} money`, `денег ${from} года`)} />
        <Stat label={t('Aynı alım gücü için', 'Same purchasing power needs', 'Для той же покупательной способности нужно')} value={result ? money(result.value) : '—'} tone="neutral" />
      </div>
    </div>
    {country === 'DE' && <Note>{t('Almanya serisi 1999 öncesinde Alman Markı dönemini de kapsar; endeks oranı para biriminden bağımsızdır. Mark tutarını euroya çevirmek için 1 € = 1,95583 DM kullanın.', 'The German series also covers the Deutsche Mark era before 1999; the index ratio is currency-neutral. Use 1 € = 1.95583 DM to convert Mark amounts.', 'Немецкий ряд охватывает и эпоху марки до 1999 года; отношение индексов не зависит от валюты. Для пересчёта марок используйте 1 € = 1,95583 DM.')}</Note>}
    <Note>{t('Sonuç, tüketici fiyat endeksinin yıllık ortalamalarına dayalı satın alma gücü tahminidir; yatırım getirisi değildir.', 'This is a purchasing-power estimate based on annual averages of the consumer price index, not an investment return.', 'Это оценка покупательной способности по среднегодовым значениям индекса потребительских цен, а не доходность инвестиций.')}</Note>
    <CoverageNote country={country} />
  </Panel>
}

export function InflationTool() {
  const { language, t } = useTranslation()
  const [country, setCountry] = useState<CountryCode>('TR')
  const [year, setYear] = useState('')
  const years = useMemo(() => availableYears(country), [country])
  const selectedYear = clampYear(year, years, years[years.length - 1])
  const points = monthlyInflation(country, selectedYear)
  const annual = annualInflation(country, selectedYear)
  const average = points.length ? points.reduce((sum, point) => sum + point.value, 0) / points.length : 0
  const scale = Math.max(0.5, ...points.map((point) => Math.abs(point.value)))
  const months = Array.from({ length: 12 }, (_, index) => ({ index, point: points.find((point) => point.month === index + 1) }))
  return <Panel>
    <div className="grid gap-4 sm:grid-cols-2">
      <Select name="country" label={t('Ülke', 'Country', 'Страна')} value={country} onChange={(value) => { setCountry(value as CountryCode); setYear('') }} options={countryOptions(language)} />
      <Select name="year" label={t('Yıl', 'Year', 'Год')} value={String(selectedYear)} onChange={setYear} options={yearOptions(years)} />
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <Result label={annual?.partial ? t(`${selectedYear} yılbaşından ${monthName(annual.through.month - 1, language)} sonuna`, `${selectedYear} year to ${monthName(annual.through.month - 1, language)}`, `${selectedYear}: с начала года по ${monthName(annual.through.month - 1, language)}`) : t(`${selectedYear} yıllık enflasyon`, `${selectedYear} annual inflation`, `Инфляция за ${selectedYear} год`)} value={annual ? formatPercent(annual.value, language) : '—'} detail={annual ? (annual.partial ? t('Kısmi yıl; önceki Aralık’a göre birikimli değişim.', 'Partial year; cumulative change versus the previous December.', 'Неполный год; накопленное изменение к декабрю предыдущего года.') : t('Aralık’tan Aralık’a birikimli değişim.', 'December-to-December cumulative change.', 'Накопленное изменение декабрь к декабрю.')) : t('Önceki yılın Aralık verisi olmadığından yıllık değer hesaplanamadı.', 'No previous-December value, so the annual figure is unavailable.', 'Нет значения за предыдущий декабрь, поэтому годовой показатель недоступен.')} />
      <Stat label={t('Aylık ortalama', 'Monthly average', 'Среднемесячная')} value={formatPercent(average, language)} detail={`${points.length} ${t('ay', 'months', 'мес.')}`} />
      <Stat label={t('En yüksek ay', 'Highest month', 'Максимум за месяц')} value={points.length ? `${monthName(points.reduce((best, point) => (point.value > best.value ? point : best)).month - 1, language)} · ${formatPercent(Math.max(...points.map((point) => point.value)), language)}` : '—'} />
    </div>
    <div className="mt-6 rounded-2xl bg-[#f8faff] p-5">
      <p className="text-[.72rem] font-semibold text-[#74819a]">{t('Aylık değişim', 'Month-over-month change', 'Изменение месяц к месяцу')} · {countryLabels[country][language]} {selectedYear}</p>
      <div className="mt-5 flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label={t('Aylık enflasyon çubuk grafiği', 'Monthly inflation bar chart', 'Столбчатая диаграмма месячной инфляции')}>
        {months.map(({ index, point }) => <div key={index} className="group relative flex h-full flex-1 flex-col justify-end">
          {point ? <div className={`w-full rounded-t-md ${point.value < 0 ? 'bg-[#84bca0]' : 'bg-gradient-to-t from-[#6284e4] to-[#b7c8ff]'}`} style={{ height: `${Math.max(2, (Math.abs(point.value) / scale) * 100)}%` }} /> : <div className="w-full rounded-t-md border border-dashed border-[#d3dcec] bg-white" style={{ height: '6%' }} />}
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[.58rem] text-[#8390aa] opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">{point ? formatPercent(point.value, language) : t('veri yok', 'no data', 'нет данных')}</span>
        </div>)}
      </div>
      <div className="mt-2 grid grid-cols-12 text-center text-[.5rem] tracking-tight text-[#9aa4b6] sm:text-[.6rem] sm:tracking-normal">{months.map(({ index }) => <span key={index} className={index % 2 === 1 ? 'hidden min-[420px]:block' : ''}>{monthName(index, language)}</span>)}</div>
    </div>
    <DataTable headers={[t('Ay', 'Month', 'Месяц'), t('Aylık değişim', 'Monthly change', 'Изменение за месяц')]} rows={points.map((point) => [monthName(point.month - 1, language, 'long'), formatPercent(point.value, language)])} maxHeight="max-h-64" minWidth="min-w-0" />
    <CoverageNote country={country} />
  </Panel>
}

export function RoiTool() {
  const { language, t } = useTranslation()
  const [cost, setCost] = useState('100000')
  const [value, setValue] = useState('145000')
  const [country, setCountry] = useState<CountryCode>('TR')
  const [fromYear, setFromYear] = useState('2020')
  const [inflation, setInflation] = useState('')
  const [details, setDetails] = useState(false)
  const years = useMemo(() => availableYears(country), [country])
  const from = clampYear(fromYear, years, years[years.length - 1])
  const currentYear = new Date().getFullYear()
  const adjusted = adjustForInflation(Number(cost) || 0, country, from, currentYear)
  const impliedInflation = adjusted ? (adjusted.factor - 1) * 100 : 0
  const usedInflation = inflation.trim() === '' ? impliedInflation : Number(inflation) || 0
  const basic = roi(Number(cost), Number(value), usedInflation)
  const spanYears = Math.max(0, currentYear - from)
  const cagr = spanYears > 0 && Number(cost) > 0 && Number(value) > 0 ? ((Number(value) / Number(cost)) ** (1 / spanYears) - 1) * 100 : null
  const currency = COUNTRY_CURRENCY[country]
  const money = (amount: number) => formatMoney(amount, language, currency, 0)
  return <Panel>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field name="cost" label={t('İlk yatırım', 'Initial investment', 'Первоначальная инвестиция')} value={cost} onChange={setCost} suffix={currency} min="0" />
      <Field name="value" label={t('Bugünkü değer', 'Value today', 'Стоимость сегодня')} value={value} onChange={setValue} suffix={currency} min="0" />
      <Select name="country" label={t('Enflasyon ülkesi', 'Inflation country', 'Страна инфляции')} value={country} onChange={(code) => setCountry(code as CountryCode)} options={countryOptions(language)} />
      <Select name="fromYear" label={t('Yatırım yılı', 'Investment year', 'Год инвестиции')} value={String(from)} onChange={setFromYear} options={yearOptions(years)} />
    </div>
    <div className="mt-4 max-w-sm"><Field name="inflation" label={t('Dönem enflasyonu (opsiyonel)', 'Period inflation (optional)', 'Инфляция за период (необязательно)')} value={inflation} onChange={setInflation} suffix="%" placeholder={formatNumber(impliedInflation, language, { maximumFractionDigits: 1 })} hint={t('Boş bırakırsan seçilen ülkenin TÜFE verisinden hesaplanır.', 'Leave empty to use the selected country’s CPI data.', 'Оставьте пустым, чтобы использовать ИПЦ выбранной страны.')} /></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <Result label={t('Nominal getiri', 'Nominal return', 'Номинальная доходность')} value={formatPercent(basic.nominalPercent, language)} detail={`${t('Kâr', 'Profit', 'Прибыль')}: ${money(basic.profit)}`} tone={basic.profit >= 0 ? 'positive' : 'negative'} />
      <Result label={t('Reel getiri', 'Real return', 'Реальная доходность')} value={formatPercent(basic.realPercent, language)} detail={`${t('Dönem enflasyonu', 'Period inflation', 'Инфляция за период')}: ${formatPercent(usedInflation, language, 1)}${adjusted && inflation.trim() === '' ? ` (${adjusted.from.year}→${adjusted.to.year})` : ''}`} tone={basic.realPercent >= 0 ? 'positive' : 'negative'} />
      <Result label={t('Bugünkü alım gücüyle kâr', 'Profit in today’s money', 'Прибыль в сегодняшних деньгах')} value={adjusted ? money(Number(value) - adjusted.value) : t('Veri yok', 'No data', 'Нет данных')} detail={adjusted ? t(`İlk yatırım bugün ${money(adjusted.value)} ediyor`, `The initial investment equals ${money(adjusted.value)} today`, `Первоначальная инвестиция сегодня равна ${money(adjusted.value)}`) : undefined} tone={adjusted && Number(value) - adjusted.value >= 0 ? 'positive' : 'negative'} />
    </div>
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Stat label={t('Yıllık bileşik getiri', 'Annualised return (CAGR)', 'Среднегодовая доходность (CAGR)')} value={cagr === null ? '—' : formatPercent(cagr, language)} detail={`${spanYears} ${t('yıl', 'years', 'лет')}`} />
      <Stat label={t('Fiyat düzeyi', 'Price level', 'Уровень цен')} value={adjusted ? `×${formatNumber(adjusted.factor, language, { maximumFractionDigits: 2 })}` : '—'} />
      <Stat label={t('Değer / maliyet', 'Value / cost', 'Стоимость / затраты')} value={Number(cost) > 0 ? `×${formatNumber(Number(value) / Number(cost), language, { maximumFractionDigits: 2 })}` : '—'} />
    </div>
    <Disclosure open={details} onToggle={() => setDetails((state) => !state)} openLabel={t('Yöntemi gizle', 'Hide method', 'Скрыть метод')} closedLabel={t('Yöntemi göster', 'Show method', 'Показать метод')} controls="roi-method" />
    {details && <div id="roi-method" className="mt-3 rounded-2xl bg-[#f8faff] p-4 text-[.74rem] leading-relaxed text-[#66728a]"><p>{t('Nominal getiri = (bugünkü değer − ilk yatırım) / ilk yatırım. Reel getiri = (1 + nominal) / (1 + enflasyon) − 1. TÜFE bazlı enflasyon, yatırım yılının ve verideki son yılın yıllık ortalama endeksleri oranlanarak bulunur.', 'Nominal return = (value today − initial investment) / initial investment. Real return = (1 + nominal) / (1 + inflation) − 1. CPI-based inflation compares the annual-average index of the investment year with the last published year.', 'Номинальная доходность = (стоимость сегодня − инвестиция) / инвестиция. Реальная доходность = (1 + номинальная) / (1 + инфляция) − 1. Инфляция по ИПЦ сравнивает среднегодовой индекс года инвестиции с последним опубликованным годом.')}</p></div>}
    <CoverageNote country={country} />
  </Panel>
}
