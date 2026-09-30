'use client'

import { useEffect, useMemo, useState } from 'react'
import { LineChart } from '@/components/result-chart'
import { Switch } from '@/components/ui/switch'
import { useTranslation } from '@/hooks/use-language'
import { formatMoney, formatNumber, formatPercent, monthName, type Language } from '@/lib/format'
import { averageAnnualInflation, COUNTRY_CODES, COUNTRY_CURRENCY, COUNTRY_NAMES, DATA_LAST_UPDATED, latestAnnualInflation, type CountryCode } from '@/lib/economic-data'
import { adjustGrowthForInflation, projectGrowth, type Compounding, type ContributionFrequency, type ContributionTiming, type GrowthResult, type RateKind, type RealGrowth } from '@/lib/growth'
import { ASSET_IDS, assetCoverage, assetSources, CPI_COUNTRY_FOR_CURRENCY, CURRENCY_CODES, DEFAULT_WITHHOLDING_PERCENT, inflationPath, investmentOutcome, isCurrency, latestExchangeRate, type AssetId, type CurrencyCode, type InvestmentOutcome, type InvestmentPlanKind, type InvestmentPoint } from '@/lib/market-data'
import { compareMonths, type MonthKey } from '@/lib/series'
import { DataTable, Field, FormSection, Note, Panel, RatioBar, Result, ResultTabs, Segmented, Select, Stat, YearStrip } from './shared'

type Mode = 'investment' | 'savings' | 'compound'
type ResultView = 'yearly' | 'monthly'
type RateUnit = 'yearly' | 'monthly'
const roundTo = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits
/** Rates are typed in the chosen unit; the engines always work with annual percentages. */
const toAnnual = (value: number, unit: RateUnit) => (unit === 'monthly' ? ((1 + value / 100) ** 12 - 1) * 100 : value)
const fromAnnual = (value: number, unit: RateUnit) => (unit === 'monthly' ? ((1 + value / 100) ** (1 / 12) - 1) * 100 : value)
type Preset = Mode | 'historical'
type Copy = Record<Language, string>
const MODE_SLUGS: Record<Mode, string> = { investment: 'investment-calculator', savings: 'savings-calculator', compound: 'compound-interest-calculator' }
const HISTORICAL_SLUG = 'historical-investment-calculator'
const modeLabels: Record<Mode, Copy> = { investment: { tr: 'Yatırım', en: 'Investment', ru: 'Инвестиции' }, savings: { tr: 'Tasarruf', en: 'Savings', ru: 'Накопления' }, compound: { tr: 'Bileşik Faiz', en: 'Compound interest', ru: 'Сложный процент' } }
const currencyNames: Record<CurrencyCode, Copy> = { TRY: { tr: 'Türk lirası', en: 'Turkish lira', ru: 'Турецкая лира' }, USD: { tr: 'Amerikan doları', en: 'US dollar', ru: 'Доллар США' }, EUR: { tr: 'Euro', en: 'Euro', ru: 'Евро' }, GBP: { tr: 'İngiliz sterlini', en: 'Pound sterling', ru: 'Фунт стерлингов' }, CHF: { tr: 'İsviçre frangı', en: 'Swiss franc', ru: 'Швейцарский франк' }, JPY: { tr: 'Japon yeni', en: 'Japanese yen', ru: 'Японская иена' }, CNY: { tr: 'Çin yuanı', en: 'Chinese yuan', ru: 'Китайский юань' }, INR: { tr: 'Hint rupisi', en: 'Indian rupee', ru: 'Индийская рупия' }, CAD: { tr: 'Kanada doları', en: 'Canadian dollar', ru: 'Канадский доллар' }, AUD: { tr: 'Avustralya doları', en: 'Australian dollar', ru: 'Австралийский доллар' } }
const pick = (language: Language, tr: string, en: string, ru: string) => (language === 'tr' ? tr : language === 'ru' ? ru : en)
const assetNames = (asset: AssetId, language: Language) => (asset === 'GOLD' ? pick(language, 'Gram altın', 'Gold (gram)', 'Золото (грамм)') : asset === 'NASDAQ' ? pick(language, 'NASDAQ bileşik endeksi', 'NASDAQ Composite index', 'Индекс NASDAQ Composite') : asset === 'DEPOSIT' ? pick(language, 'TL mevduat (faiz getirisi)', 'Lira deposit (interest)', 'Вклад в лирах (проценты)') : currencyNames[asset][language])
const unitNames = (asset: AssetId, language: Language) => (asset === 'GOLD' ? pick(language, 'gram', 'grams', 'грамм') : asset === 'NASDAQ' ? pick(language, 'endeks puanı', 'index points', 'пунктов индекса') : asset)
const monthLabel = (key: MonthKey, language: Language) => `${monthName(key.month - 1, language)} ${key.year}`
const unitDigits = (asset: AssetId, units: number) => (asset === 'NASDAQ' ? 4 : units >= 1000 ? 0 : 2)
const priceDigits = (price: number) => (price < 1 ? 4 : price < 100 ? 2 : 0)
const PRESETS: Record<Mode, { contribution: string; rate: string; rateKind: RateKind }> = { compound: { contribution: '0', rate: '40', rateKind: 'apr' }, savings: { contribution: '1000', rate: '35', rateKind: 'apy' }, investment: { contribution: '1000', rate: '15', rateKind: 'apr' } }

export function CompoundInterestCalculator() { return <GrowthTool preset="compound" /> }
export function InvestmentCalculator() { return <GrowthTool preset="investment" /> }
export function SavingsCalculator() { return <GrowthTool preset="savings" /> }
export function HistoricalInvestmentCalculator() { return <GrowthTool preset="historical" /> }

/** One calculator behind four pages: the preset only decides which fields start visible and how the form is pre-filled. */
function GrowthTool({ preset }: { preset: Preset }) {
  const { language, t } = useTranslation()
  const [mode, setMode] = useState<Mode>(preset === 'historical' ? 'investment' : preset)
  const [historical, setHistorical] = useState(preset === 'historical')
  const [initial, setInitial] = useState('10000')
  const [contribution, setContribution] = useState(PRESETS[preset === 'historical' ? 'investment' : preset].contribution)
  const [frequency, setFrequency] = useState<ContributionFrequency>('monthly')
  const [rate, setRate] = useState(PRESETS[preset === 'historical' ? 'investment' : preset].rate)
  const [rateKind, setRateKind] = useState<RateKind>(PRESETS[preset === 'historical' ? 'investment' : preset].rateKind)
  const [compounding, setCompounding] = useState<Compounding>('monthly')
  const [duration, setDuration] = useState('5')
  const [durationUnit, setDurationUnit] = useState<'years' | 'months'>('years')
  const [timing, setTiming] = useState<ContributionTiming>('start')
  const [currency, setCurrency] = useState<CurrencyCode>('TRY')
  const [asset, setAsset] = useState<AssetId>('GOLD')
  const [base, setBase] = useState<CurrencyCode>('TRY')
  const [contributionCurrency, setContributionCurrency] = useState<CurrencyCode>('TRY')
  const [contributionKind, setContributionKind] = useState<'money' | 'units'>('money')
  const [advancedCurrency, setAdvancedCurrency] = useState(false)
  const [year, setYear] = useState('2015')
  const [month, setMonth] = useState('1')
  const [withholding, setWithholding] = useState(String(DEFAULT_WITHHOLDING_PERCENT))
  const [view, setView] = useState<ResultView>('yearly')
  const [inflationOn, setInflationOn] = useState(preset === 'historical')
  const [inflationCountry, setInflationCountry] = useState<CountryCode | ''>('')
  const [inflationRate, setInflationRate] = useState('')
  const [customInflation, setCustomInflation] = useState(false)
  const [inflationUnit, setInflationUnit] = useState<RateUnit>('yearly')
  const [contributionInflation, setContributionInflation] = useState('')
  const [customContributionInflation, setCustomContributionInflation] = useState(false)
  const [startRate, setStartRate] = useState('')
  const [customStartRate, setCustomStartRate] = useState(false)

  // Keep the address in step with the active mode so every view has its own shareable URL.
  useEffect(() => {
    const slug = historical ? HISTORICAL_SLUG : MODE_SLUGS[mode]
    const next = `/tools/${slug}`
    if (window.location.pathname !== next) window.history.replaceState(window.history.state, '', `${next}${window.location.search}${window.location.hash}`)
  }, [mode, historical])

  const changeMode = (next: Mode) => {
    setMode(next)
    setContribution(PRESETS[next].contribution)
    setRate(PRESETS[next].rate)
    setRateKind(PRESETS[next].rateKind)
    if (next !== 'investment') { setCompounding('monthly'); setTiming('start'); setFrequency('monthly') }
  }
  const showContribution = mode !== 'compound'
  const showAdvanced = mode === 'investment'
  const months = Math.max(1, Math.round((Number(duration) || 0) * (durationUnit === 'years' ? 12 : 1)))
  const effectiveBase: CurrencyCode = advancedCurrency ? base : 'TRY'
  const effectiveContributionCurrency: CurrencyCode = advancedCurrency ? contributionCurrency : effectiveBase
  const fxActive = !historical && showContribution && advancedCurrency && contributionCurrency !== currency
  const shown = (annual: number) => String(roundTo(fromAnnual(annual, inflationUnit), inflationUnit === 'monthly' ? 2 : 1))
  // The CPI country follows the money's currency until the user picks one; the estimate follows the country until the user types one.
  const inflationCurrency = historical ? effectiveBase : currency
  const effectiveCountry: CountryCode = inflationCountry || (isCurrency(inflationCurrency) ? CPI_COUNTRY_FOR_CURRENCY[inflationCurrency] : undefined) || 'TR'
  const countryName = COUNTRY_NAMES[effectiveCountry][language]
  const latestInflation = latestAnnualInflation(effectiveCountry)
  const averageInflation = averageAnnualInflation(effectiveCountry)
  const autoInflationRate = roundTo(averageInflation?.value ?? latestInflation?.value ?? 0, 1)
  // Number() keeps these dependencies as plain primitives for the React Compiler's memoization checks.
  const inflationPercent = Number(customInflation ? toAnnual(Number(inflationRate) || 0, inflationUnit) : autoInflationRate)
  const contributionCountry = CPI_COUNTRY_FOR_CURRENCY[contributionCurrency]
  const contributionAverage = contributionCountry ? averageAnnualInflation(contributionCountry) : null
  const autoContributionInflation = roundTo(contributionAverage?.value ?? 0, 1)
  const contributionInflationPercent = Number(customContributionInflation ? toAnnual(Number(contributionInflation) || 0, inflationUnit) : autoContributionInflation)
  const latestRate = fxActive ? latestExchangeRate(contributionCurrency, currency) : null
  const autoStartRate = latestRate ? roundTo(latestRate.rate, latestRate.rate < 1 ? 4 : 2) : 0
  const startRateValue = Number(customStartRate ? Number(startRate) || 0 : autoStartRate)
  // Relative purchasing-power parity: the currency with the higher inflation loses value at the inflation differential.
  const fxChangePercent = ((1 + inflationPercent / 100) / (1 + contributionInflationPercent / 100) - 1) * 100
  const projection = useMemo(() => projectGrowth({ initial: Number(initial) || 0, contribution: showContribution ? Number(contribution) || 0 : 0, contributionFrequency: frequency, annualRatePercent: Number(rate) || 0, rateKind, compounding, months, timing, conversion: fxActive && startRateValue > 0 ? { startRate: startRateValue, annualChangePercent: fxChangePercent } : undefined }), [initial, contribution, showContribution, frequency, rate, rateKind, compounding, months, timing, fxActive, startRateValue, fxChangePercent])
  const changeInflationUnit = (next: RateUnit) => {
    if (next === inflationUnit) return
    const convert = (raw: string) => { const value = Number(raw); return Number.isFinite(value) ? String(roundTo(fromAnnual(toAnnual(value, inflationUnit), next), next === 'monthly' ? 2 : 1)) : raw }
    if (customInflation) setInflationRate(convert(inflationRate))
    if (customContributionInflation) setContributionInflation(convert(contributionInflation))
    setInflationUnit(next)
  }
  const rateSuffix = inflationUnit === 'monthly' ? t('%/ay', '%/mo', '%/мес') : t('%/yıl', '%/yr', '%/год')
  const real = useMemo(() => (inflationOn && !historical ? adjustGrowthForInflation(projection, inflationPercent) : null), [inflationOn, historical, projection, inflationPercent])
  const deposit = asset === 'DEPOSIT'
  const assetChoices = ASSET_IDS.filter((id) => id !== effectiveBase && (id !== 'DEPOSIT' || effectiveBase === 'TRY'))
  const safeAsset = assetChoices.includes(asset) ? asset : assetChoices[0]
  const coverage = assetCoverage(safeAsset, effectiveBase, effectiveContributionCurrency)
  const years = useMemo(() => (coverage ? Array.from({ length: coverage.last.year - coverage.first.year + 1 }, (_, index) => coverage.first.year + index) : []), [coverage])
  const selectedYear = years.includes(Number(year)) ? Number(year) : years[Math.max(0, years.length - 2)]
  const monthChoices = Array.from({ length: 12 }, (_, index) => index + 1).filter((candidate) => coverage && compareMonths({ year: selectedYear, month: candidate }, coverage.first) >= 0 && compareMonths({ year: selectedYear, month: candidate }, coverage.last) < 0)
  const selectedMonth = monthChoices.includes(Number(month)) ? Number(month) : monthChoices[0] ?? 1
  const start = { year: selectedYear, month: selectedMonth }
  const withholdingPercent = Math.min(100, Math.max(0, Number(withholding) || 0))
  const planKind: InvestmentPlanKind = !showContribution || !(Number(contribution) > 0) ? 'lump' : contributionKind === 'units' && !deposit ? 'periodic-units' : 'periodic'
  const outcome = useMemo(() => (historical ? investmentOutcome(planKind === 'lump' ? { kind: 'lump', amount: Number(initial) || 0 } : { kind: planKind, amount: Number(contribution) || 0, initial: Number(initial) || 0 }, safeAsset, start, { base: effectiveBase, contributionCurrency: effectiveContributionCurrency, frequency, withholdingPercent, inflationCountry: inflationOn ? effectiveCountry : undefined }) : null), [historical, planKind, initial, contribution, safeAsset, start.year, start.month, effectiveBase, effectiveContributionCurrency, frequency, withholdingPercent, inflationOn, effectiveCountry]) // eslint-disable-line react-hooks/exhaustive-deps
  const money = (value: number, digits = 0, code = historical ? effectiveBase : currency) => formatMoney(value, language, code, digits)
  const percent = (value: number | null, digits = 1) => (value === null ? '—' : formatPercent(value, language, digits))
  const showRate = (annual: number) => percent(fromAnnual(annual, inflationUnit), inflationUnit === 'monthly' ? 2 : 1)
  const number = (value: number, digits: number) => formatNumber(value, language, { maximumFractionDigits: digits })
  const contributionLabel = t('Düzenli katkı', 'Regular contribution', 'Регулярный взнос')
  const contributionSuffix = historical && planKind === 'periodic-units' ? unitNames(safeAsset, language) : historical ? effectiveContributionCurrency : fxActive ? contributionCurrency : currency
  const rateLabel = rateKind === 'apy' ? t('Yıllık getiri (APY, efektif)', 'Annual return (APY, effective)', 'Годовая доходность (APY, эффективная)') : t('Yıllık getiri (APR, nominal)', 'Annual return (APR, nominal)', 'Годовая доходность (APR, номинальная)')

  const currencyOptions = CURRENCY_CODES.map((code) => ({ value: code, label: `${currencyNames[code][language]} (${code})` }))
  const modeDescription = historical ? t('Geçmişteki gerçek fiyat ve kur verileriyle “o zaman yatırsaydım” sorusunu yanıtlar.', 'Answers “what if I had invested back then” with real historical prices and exchange rates.', 'Отвечает на вопрос «а если бы я вложил тогда» по реальным историческим ценам и курсам.') : mode === 'compound' ? t('Tek bir tutarın faizle büyümesi; düzenli katkı bu modda kapalıdır.', 'A single amount growing with interest; regular contributions are off in this mode.', 'Рост одной суммы под проценты; регулярные взносы в этом режиме отключены.') : mode === 'savings' ? t('Aylık birikimle büyüme; getiri efektif yıllık oran (APY) olarak alınır.', 'Growth with monthly savings; the return is taken as an effective annual rate (APY).', 'Рост с ежемесячными накоплениями; доходность берётся как эффективная годовая ставка (APY).') : t('Tüm seçenekler açık: katkı sıklığı ve zamanı, oran tipi ve bileşik sıklığı.', 'Every option is open: contribution frequency and timing, rate type and compounding.', 'Открыты все параметры: частота и момент взносов, тип ставки и капитализация.')

  return <Panel>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <Segmented name="mode" label={t('Hesaplama türü', 'Calculation type', 'Тип расчёта')} value={mode} onChange={changeMode} options={(['investment', 'savings', 'compound'] as Mode[]).map((value) => ({ value, label: modeLabels[value][language] }))} className="w-full max-w-xl" />
      <div className="flex flex-wrap gap-2">
        <Switch name="historical" label={t('Gerçek geçmiş verilerle hesapla', 'Use real historical data', 'Считать по реальным историческим данным')} description={t('Sabit oran yerine geçmiş fiyat ve kurlar', 'Past prices and rates instead of a fixed rate', 'Прошлые цены и курсы вместо фиксированной ставки')} checked={historical} onCheckedChange={setHistorical} />
        <Switch name="inflation" label={t('Enflasyonu hesaba kat', 'Account for inflation', 'Учитывать инфляцию')} description={historical ? t('Seçilen ülkenin gerçek TÜFE verisiyle', 'With the chosen country’s real CPI data', 'По реальным данным ИПЦ выбранной страны') : t('Tahmini yıllık oranla reel değer ve kayıp', 'Real value and loss at an estimated annual rate', 'Реальная стоимость и потери при ожидаемой ставке')} checked={inflationOn} onCheckedChange={setInflationOn} />
      </div>
    </div>
    <p className="mt-2 text-[.72rem] text-[#7a8699]">{modeDescription}</p>

    <FormSection title={t('Tutarlar', 'Amounts', 'Суммы')} aside={!historical && showContribution ? <Switch name="advancedCurrency" label={t('Gelişmiş para birimi seçenekleri', 'Advanced currency options', 'Расширенные настройки валют')} checked={advancedCurrency} onCheckedChange={setAdvancedCurrency} /> : undefined}>
      <Field name="initial" label={t('Başlangıç miktarı', 'Starting amount', 'Начальная сумма')} value={initial} onChange={setInitial} suffix={historical ? effectiveBase : currency} min="0" labelExtra={historical && planKind !== 'lump' ? t('0 olabilir', 'can be 0', 'может быть 0') : undefined} />
      {showContribution && <Field name="contribution" label={contributionLabel} value={contribution} onChange={setContribution} suffix={contributionSuffix} min="0" labelExtra={frequency === 'monthly' ? t('her ay', 'per month', 'в месяц') : t('her yıl', 'per year', 'в год')} />}
      {showContribution && <Segmented name="frequency" label={t('Katkı sıklığı', 'Contribution frequency', 'Частота взносов')} value={frequency} onChange={setFrequency} options={[{ value: 'monthly', label: t('Aylık', 'Monthly', 'Ежемесячно') }, { value: 'yearly', label: t('Yıllık', 'Yearly', 'Ежегодно') }]} />}
      {historical && showContribution && !deposit && Number(contribution) > 0 && <Segmented name="contributionKind" label={t('Katkı türü', 'Contribution type', 'Тип взноса')} value={contributionKind} onChange={setContributionKind} options={[{ value: 'money', label: t('Para tutarı', 'Money', 'Деньги') }, { value: 'units', label: t('Varlık miktarı', 'Asset units', 'Единицы') }]} />}
      {!historical && <Select name="currency" label={advancedCurrency && showContribution ? t('Hesap para birimi', 'Account currency', 'Валюта счёта') : t('Para birimi', 'Currency', 'Валюта')} value={currency} onChange={(value) => { if (isCurrency(value)) setCurrency(value) }} options={currencyOptions} />}
      {!historical && showContribution && advancedCurrency && <Select name="contributionCurrency" label={t('Katkı para birimi', 'Contribution currency', 'Валюта взноса')} value={contributionCurrency} onChange={(value) => { if (isCurrency(value)) setContributionCurrency(value) }} options={currencyOptions} />}
      {fxActive && <Field name="startRate" label={t(`Bugünkü kur (1 ${contributionCurrency})`, `Rate today (1 ${contributionCurrency})`, `Курс сегодня (1 ${contributionCurrency})`)} value={customStartRate ? startRate : String(autoStartRate)} onChange={(value) => { setCustomStartRate(true); setStartRate(value) }} suffix={currency} min="0" labelExtra={customStartRate
        ? <button type="button" onClick={() => setCustomStartRate(false)} className="focus-ring rounded underline-offset-2 hover:underline">{latestRate?.month ? t(`↺ ${monthLabel(latestRate.month, language)}: ${autoStartRate}`, `↺ ${monthLabel(latestRate.month, language)}: ${autoStartRate}`, `↺ ${monthLabel(latestRate.month, language)}: ${autoStartRate}`) : '↺'}</button>
        : latestRate?.month ? t(`${monthLabel(latestRate.month, language)} ortalaması`, `${monthLabel(latestRate.month, language)} average`, `среднее за ${monthLabel(latestRate.month, language)}`) : t('veri yok, elle gir', 'no data, enter manually', 'нет данных, введите вручную')} />}
    </FormSection>

    {!historical && <FormSection title={t('Getiri ve süre', 'Return and duration', 'Доходность и срок')}>
      <Field name="rate" label={rateLabel} value={rate} onChange={setRate} suffix="%" min="-100" max="1000" labelExtra={rateKind === 'apr' ? t(`efektif ${percent(projection.effectiveAnnualPercent, 2)}`, `effective ${percent(projection.effectiveAnnualPercent, 2)}`, `эффективная ${percent(projection.effectiveAnnualPercent, 2)}`) : undefined} />
      {(showAdvanced || mode === 'savings') && <Segmented name="rateKind" label={t('Oran tipi', 'Rate type', 'Тип ставки')} value={rateKind} onChange={setRateKind} options={[{ value: 'apr', label: 'APR' }, { value: 'apy', label: 'APY' }]} />}
      {(showAdvanced || mode === 'compound') && rateKind === 'apr' && <Select name="compounding" label={t('Bileşik sıklığı', 'Compounding frequency', 'Частота капитализации')} value={compounding} onChange={(value) => setCompounding(value as Compounding)} options={[{ value: 'daily', label: t('Günlük', 'Daily', 'Ежедневно') }, { value: 'monthly', label: t('Aylık', 'Monthly', 'Ежемесячно') }, { value: 'quarterly', label: t('Çeyreklik', 'Quarterly', 'Ежеквартально') }, { value: 'yearly', label: t('Yıllık', 'Yearly', 'Ежегодно') }]} />}
      <div className="joined-field items-end"><Field name="duration" label={t('Süre', 'Duration', 'Срок')} value={duration} onChange={setDuration} min="1" max={durationUnit === 'years' ? '100' : '1200'} /><Segmented name="durationUnit" label={t('Süre birimi', 'Duration unit', 'Единица срока')} hideLabel value={durationUnit} onChange={setDurationUnit} options={[{ value: 'years', label: t('yıl', 'years', 'лет') }, { value: 'months', label: t('ay', 'months', 'мес.') }]} className="joined-unit" /></div>
      {showAdvanced && showContribution && <Segmented name="timing" label={t('Katkı zamanı', 'Contribution timing', 'Момент взноса')} value={timing} onChange={setTiming} options={[{ value: 'start', label: t('Dönem başı', 'Start of period', 'Начало периода') }, { value: 'end', label: t('Dönem sonu', 'End of period', 'Конец периода') }]} />}
    </FormSection>}

    {historical && <FormSection title={t('Varlık ve tarih', 'Asset and date', 'Актив и дата')} aside={<Switch name="advancedCurrency" label={t('Gelişmiş para birimi seçenekleri', 'Advanced currency options', 'Расширенные настройки валют')} checked={advancedCurrency} onCheckedChange={setAdvancedCurrency} />}>
      <Select name="asset" label={t('Varlık', 'Asset', 'Актив')} value={safeAsset} onChange={(value) => setAsset(value as AssetId)} options={assetChoices.map((id) => ({ value: id, label: assetNames(id, language) }))} />
      <Select name="year" label={t('Başlangıç yılı', 'Start year', 'Год начала')} value={String(selectedYear)} onChange={setYear} options={[...years].reverse().map((value) => ({ value: String(value), label: String(value) }))} />
      <Select name="month" label={t('Başlangıç ayı', 'Start month', 'Месяц начала')} value={String(selectedMonth)} onChange={setMonth} options={monthChoices.map((value) => ({ value: String(value), label: monthName(value - 1, language, 'long') }))} />
      {deposit && <Field name="withholding" label={t('Faiz stopajı', 'Withholding tax', 'Налог на проценты')} value={withholding} onChange={setWithholding} suffix="%" min="0" max="100" labelExtra={t('faizden kesilir', 'deducted from interest', 'удерживается из процентов')} />}
      {advancedCurrency && <Select name="base" label={t('Hesap para birimi', 'Account currency', 'Валюта счёта')} value={base} onChange={(value) => { if (isCurrency(value)) setBase(value) }} options={currencyOptions} />}
      {advancedCurrency && <Select name="contributionCurrency" label={t('Katkı para birimi', 'Contribution currency', 'Валюта взноса')} value={contributionCurrency} onChange={(value) => { if (isCurrency(value)) setContributionCurrency(value) }} options={currencyOptions} />}
    </FormSection>}
    {historical && <p className="mt-3 text-[.7rem] leading-relaxed text-[#8b97ab]">{advancedCurrency ? t(`Hesap para birimi (${effectiveBase}) sonucun ve başlangıç tutarının birimi; katkı para birimi (${effectiveContributionCurrency}) düzenli katkının birimidir ve o ayın kuruyla ${effectiveBase}’ye çevrilir. Örnek: her ay 100 $ karşılığı TL.`, `The account currency (${effectiveBase}) is the unit of the result and the starting amount; the contribution currency (${effectiveContributionCurrency}) is the unit of the regular contribution, converted at that month’s rate. Example: 100 $ worth of lira every month.`, `Валюта счёта (${effectiveBase}) — единица результата и начальной суммы; валюта взноса (${effectiveContributionCurrency}) — единица регулярного взноса, пересчитываемая по курсу того месяца. Пример: каждый месяц лиры на 100 $.`) : t(`Her şey ${effectiveBase} cinsinden. Hesabı başka bir para biriminde tutmak veya katkıyı dolar, euro, yen gibi bir birimde yapmak için gelişmiş seçenekleri aç.`, `Everything is in ${effectiveBase}. Turn on the advanced options to keep the account in another currency or contribute in dollars, euros, yen and so on.`, `Всё в ${effectiveBase}. Включите расширенные настройки, чтобы вести счёт в другой валюте или вносить доллары, евро, иены и т. д.`)}</p>}
    {historical && deposit && <Note>{t('Faiz oranları yıllık olarak verilir: örneğin yıllık %36, ayda yaklaşık %3 demektir. Her ay yıllık oranın 1/12’si uygulanır, stopaj düşülür ve faiz bakiyeye eklenir (aylık bileşik). Kaynak bankalararası gecelik faizin aylık ortalamasıdır; bankaların mevduat faizi farklı olabilir.', 'Interest rates are annual: 36% per year means roughly 3% per month. Each month applies one twelfth of the annual rate, deducts withholding and adds the interest to the balance (monthly compounding). The source is the monthly average overnight interbank rate; bank deposit rates may differ.', 'Ставки указаны годовые: 36% в год — это примерно 3% в месяц. Каждый месяц применяется 1/12 годовой ставки, удерживается налог, а проценты прибавляются к остатку (ежемесячная капитализация). Источник — среднемесячная ставка овернайт межбанковского рынка; ставки банковских вкладов могут отличаться.')}</Note>}

    {(inflationOn || fxActive) && <FormSection title={fxActive ? t('Enflasyon ve kur tahmini', 'Inflation and exchange-rate estimate', 'Инфляция и прогноз курса') : t('Enflasyon', 'Inflation', 'Инфляция')} aside={!historical ? <Segmented name="inflationUnit" label={t('Oran birimi', 'Rate unit', 'Единица ставки')} hideLabel value={inflationUnit} onChange={changeInflationUnit} options={[{ value: 'yearly', label: t('Yıllık', 'Yearly', 'Годовая') }, { value: 'monthly', label: t('Aylık', 'Monthly', 'Месячная') }]} className="w-44" /> : undefined}>
      <Select name="inflationCountry" label={fxActive ? t(`${currency} enflasyonu için ülke`, `Country for ${currency} inflation`, `Страна для инфляции ${currency}`) : t('Enflasyon verisi ülkesi', 'Country for inflation data', 'Страна для данных об инфляции')} value={effectiveCountry} onChange={(value) => { setInflationCountry(value as CountryCode); setCustomInflation(false) }} options={COUNTRY_CODES.map((code) => ({ value: code, label: `${COUNTRY_NAMES[code][language]} (${COUNTRY_CURRENCY[code]})` }))} />
      {!historical && <Field name="inflationRate" label={t(`Tahmini enflasyon (${currency})`, `Estimated inflation (${currency})`, `Ожидаемая инфляция (${currency})`)} value={customInflation ? inflationRate : shown(autoInflationRate)} onChange={(value) => { setCustomInflation(true); setInflationRate(value) }} suffix={rateSuffix} min="-99" max="1000" labelExtra={customInflation
        ? <button type="button" onClick={() => setCustomInflation(false)} className="focus-ring rounded underline-offset-2 hover:underline">{t(`↺ 10 yıl ort. ${showRate(autoInflationRate)}`, `↺ 10-year avg. ${showRate(autoInflationRate)}`, `↺ ср. за 10 лет ${showRate(autoInflationRate)}`)}</button>
        : averageInflation ? t(`10 yıl ort. · son 12 ay ${showRate(latestInflation?.value ?? 0)}`, `10-year avg. · last 12 months ${showRate(latestInflation?.value ?? 0)}`, `ср. за 10 лет · за 12 мес. ${showRate(latestInflation?.value ?? 0)}`) : latestInflation ? t('son 12 ay', 'last 12 months', 'за 12 мес.') : t('veri yok', 'no data', 'нет данных')} />}
      {fxActive && <Field name="contributionInflation" label={t(`Tahmini enflasyon (${contributionCurrency})`, `Estimated inflation (${contributionCurrency})`, `Ожидаемая инфляция (${contributionCurrency})`)} value={customContributionInflation ? contributionInflation : shown(autoContributionInflation)} onChange={(value) => { setCustomContributionInflation(true); setContributionInflation(value) }} suffix={rateSuffix} min="-99" max="1000" labelExtra={customContributionInflation
        ? <button type="button" onClick={() => setCustomContributionInflation(false)} className="focus-ring rounded underline-offset-2 hover:underline">{t(`↺ 10 yıl ort. ${showRate(autoContributionInflation)}`, `↺ 10-year avg. ${showRate(autoContributionInflation)}`, `↺ ср. за 10 лет ${showRate(autoContributionInflation)}`)}</button>
        : contributionCountry && contributionAverage ? t(`10 yıl ort. (${COUNTRY_NAMES[contributionCountry][language]})`, `10-year avg. (${COUNTRY_NAMES[contributionCountry][language]})`, `ср. за 10 лет (${COUNTRY_NAMES[contributionCountry][language]})`) : t('veri yok, elle gir', 'no data, enter manually', 'нет данных, введите вручную')} />}
    </FormSection>}
    {fxActive && <p className="mt-3 text-[.7rem] leading-relaxed text-[#8b97ab]">{startRateValue > 0
      ? t(`Kur tahmini (göreli satın alma gücü paritesi): ${currency} enflasyonu ${showRate(inflationPercent)}, ${contributionCurrency} enflasyonu ${showRate(contributionInflationPercent)} → 1 ${contributionCurrency} yılda ≈ ${percent(Math.abs(fxChangePercent))} ${fxChangePercent >= 0 ? 'değer kazanır' : 'değer kaybeder'}: bugün ${money(startRateValue, priceDigits(startRateValue))}, dönem sonunda ≈ ${money(projection.endRate, priceDigits(projection.endRate))}. Her katkı o ayın tahmini kuruyla ${currency}’ye çevrilir.`, `Exchange-rate estimate (relative purchasing-power parity): ${currency} inflation ${showRate(inflationPercent)}, ${contributionCurrency} inflation ${showRate(contributionInflationPercent)} → 1 ${contributionCurrency} ${fxChangePercent >= 0 ? 'gains' : 'loses'} ≈ ${percent(Math.abs(fxChangePercent))} a year: ${money(startRateValue, priceDigits(startRateValue))} today, ≈ ${money(projection.endRate, priceDigits(projection.endRate))} at the end. Each contribution is converted to ${currency} at that month’s estimated rate.`, `Прогноз курса (относительный паритет покупательной способности): инфляция ${currency} ${showRate(inflationPercent)}, инфляция ${contributionCurrency} ${showRate(contributionInflationPercent)} → 1 ${contributionCurrency} ${fxChangePercent >= 0 ? 'дорожает' : 'дешевеет'} примерно на ${percent(Math.abs(fxChangePercent))} в год: сегодня ${money(startRateValue, priceDigits(startRateValue))}, в конце срока ≈ ${money(projection.endRate, priceDigits(projection.endRate))}. Каждый взнос пересчитывается в ${currency} по расчётному курсу того месяца.`)
      : t('Bugünkü kuru gir.', 'Enter today’s exchange rate.', 'Введите сегодняшний курс.')}</p>}
    {inflationOn && <p className="mt-3 text-[.7rem] leading-relaxed text-[#8b97ab]">{historical
      ? t(`Her katkı, yatırıldığı aydan bugüne ${countryName} TÜFE artışıyla büyütülür ve bugünkü değerle karşılaştırılır; böylece enflasyon kaybı düşüldükten sonra kalan reel kâr görünür.`, `Each contribution is grown by the ${countryName} CPI from the month it was paid until today and compared with today’s value, so the real profit after inflation is visible.`, `Каждый взнос увеличивается на рост ИПЦ (${countryName}) с месяца внесения до сегодняшнего дня и сравнивается с текущей стоимостью — так видна реальная прибыль после инфляции.`)
      : t(`Tahmini oran, ${countryName} için son 12 aylık TÜFE değişimiyle ön doldurulur; istediğin gibi değiştirebilirsin. Reel tutarlar bugünkü (başlangıç tarihindeki) satın alma gücüyle gösterilir; enflasyon kaybı, nominal değerin enflasyonun yediği kısmıdır.`, `The estimate is pre-filled with the last 12 months of ${countryName} CPI change; change it as you like. Real amounts are shown in today’s (start-date) purchasing power, and the inflation loss is the part of the nominal value eaten by inflation.`, `Оценка заполняется изменением ИПЦ (${countryName}) за последние 12 месяцев; её можно изменить. Реальные суммы показаны в сегодняшней покупательной способности (на дату начала), а потеря от инфляции — часть номинальной стоимости, «съеденная» инфляцией.`)}</p>}

    {historical
      ? (outcome ? <HistoricalResults outcome={outcome} showInflation={inflationOn} countryName={countryName} language={language} t={t} money={money} percent={percent} number={number} view={view} onViewChange={setView} /> : <Note tone="warning">{Number(initial) > 0 || Number(contribution) > 0 ? t('Bu tarih ve para birimi için fiyat verisi yok. Kapsam içinde başka bir ay seç.', 'No price data for this date and currency. Pick another month within the coverage.', 'Нет данных о ценах для этой даты и валюты. Выберите другой месяц в пределах охвата.') : t('Başlangıç miktarı veya düzenli katkı gir.', 'Enter a starting amount or a regular contribution.', 'Введите начальную сумму или регулярный взнос.')}</Note>)
      : <ProjectionResults result={projection} real={real} countryName={countryName} contributionCode={fxActive ? contributionCurrency : undefined} foreignMoney={fxActive ? (value: number) => formatMoney(value, language, contributionCurrency, 0) : undefined} language={language} t={t} money={money} percent={percent} view={view} onViewChange={setView} />}

    {historical && <Note>{t('Kaynaklar', 'Sources', 'Источники')}: {assetSources(safeAsset, effectiveBase, effectiveContributionCurrency).map((series) => <span key={series.id}><a className="underline" href={series.url} target="_blank" rel="noreferrer">{series.source}</a> ({series.unit}); </span>)}{coverage && <span>{t('Kapsam', 'Coverage', 'Охват')}: {monthLabel(coverage.first, language)} – {monthLabel(coverage.last, language)}. </span>}{t('Paket güncelleme', 'Bundle updated', 'Данные обновлены')}: {DATA_LAST_UPDATED}. {t('Aylık ortalama fiyatlar; alım-satım farkı, komisyon, vergi ve temettü dahil değildir. Yatırım tavsiyesi değildir.', 'Monthly average prices; spreads, commissions, taxes and dividends are not included. Not investment advice.', 'Среднемесячные цены; спреды, комиссии, налоги и дивиденды не учитываются. Не является инвестиционной рекомендацией.')}</Note>}
    {!historical && <Note>{(inflationOn
      ? t('Sonuçlar girdiğin sabit orana dayalı tahmindir; gerçek getiriler dalgalanır, vergi dahil değildir. Enflasyon da sabit bir yıllık oran varsayımıdır; reel tutarlar başlangıç tarihindeki alım gücüyle gösterilir. Katkılar seçilen dönem başında veya sonunda eklenir; faiz her ay işler.', 'Results are estimates based on the fixed rate you enter; real returns fluctuate and tax is not included. Inflation is likewise a constant annual assumption; real amounts are shown in start-date purchasing power. Contributions are added at the start or end of the chosen period; interest accrues monthly.', 'Результаты — оценка по введённой фиксированной ставке; реальная доходность колеблется, налоги не учтены. Инфляция тоже задана постоянной годовой ставкой; реальные суммы показаны в покупательной способности на дату начала. Взносы добавляются в начале или конце выбранного периода; проценты начисляются ежемесячно.')
      : t('Sonuçlar girdiğin sabit orana dayalı tahmindir; gerçek getiriler dalgalanır, vergi ve enflasyon dahil değildir. Katkılar seçilen dönem başında veya sonunda eklenir; faiz her ay işler.', 'Results are estimates based on the fixed rate you enter; real returns fluctuate, and tax and inflation are not included. Contributions are added at the start or end of the chosen period; interest accrues monthly.', 'Результаты — оценка по введённой фиксированной ставке; реальная доходность колеблется, налоги и инфляция не учтены. Взносы добавляются в начале или конце выбранного периода; проценты начисляются ежемесячно.')) + (fxActive ? ` ${t('Kur yolu, iki para biriminin enflasyon farkından türetilen bir varsayımdır; gerçek kurlar çok daha oynak olabilir.', 'The exchange-rate path is an assumption derived from the inflation differential; real rates can be far more volatile.', 'Траектория курса — допущение, выведенное из разницы инфляций; реальные курсы могут быть гораздо волатильнее.')}` : '')}</Note>}
  </Panel>
}

type Formatters = { language: Language; t: (a: string, b: string, c?: string) => string; money: (value: number, digits?: number) => string; percent: (value: number | null, digits?: number) => string }
type ViewProps = { view: ResultView; onViewChange: (view: ResultView) => void }
const viewOptions = (t: Formatters['t']): Array<{ value: ResultView; label: string }> => [{ value: 'yearly', label: t('Yıllık', 'Yearly', 'По годам') }, { value: 'monthly', label: t('Aylık', 'Monthly', 'По месяцам') }]

function ProjectionResults({ result, real, countryName, contributionCode, foreignMoney, language, t, money, percent, view, onViewChange }: Formatters & ViewProps & { result: GrowthResult; real: RealGrowth | null; countryName: string; contributionCode?: string; foreignMoney?: (value: number) => string }) {
  const { input } = result
  const fx = input.conversion && contributionCode && foreignMoney ? { code: contributionCode, format: foreignMoney, startRate: input.conversion.startRate } : null
  const foreignHeader = fx ? [t(`Katkı (${fx.code})`, `Contribution (${fx.code})`, `Взнос (${fx.code})`)] : []
  const [year, setYear] = useState(result.yearly.length)
  const activeYear = Math.min(Math.max(1, year), result.yearly.length)
  const yearRow = result.yearly[activeYear - 1]
  const yearReal = real?.yearly[activeYear - 1]
  const yearLabel = (value: number) => `${value}. ${t('yıl', 'year', 'год')}`
  const realColumn = (index: number) => (real ? [money(real.path[index].realValue, 2)] : [])
  const yearsText = input.months % 12 === 0 ? `${input.months / 12} ${t('yıl', 'years', 'лет')}` : `${input.months} ${t('ay', 'months', 'мес.')}`
  const gainPositive = result.gain >= 0
  return <div className="mt-6 space-y-4">
    <Result label={t(`${yearsText} sonra toplam değer`, `Total value after ${yearsText}`, `Итоговая стоимость через ${yearsText}`)} value={money(result.finalValue)} detail={`${t('Efektif yıllık', 'Effective annual', 'Эффективная годовая')} ${percent(result.effectiveAnnualPercent, 2)} · ${result.doublingYears ? t(`para ≈ ${formatNumber(result.doublingYears, language, { maximumFractionDigits: 1 })} yılda ikiye katlanır`, `money doubles in ≈ ${formatNumber(result.doublingYears, language, { maximumFractionDigits: 1 })} years`, `деньги удваиваются примерно за ${formatNumber(result.doublingYears, language, { maximumFractionDigits: 1 })} лет`) : t('getiri yok', 'no growth', 'нет роста')}${real ? ` · ${t(`bugünkü parayla ${money(real.realFinalValue)}`, `${money(real.realFinalValue)} in today’s money`, `${money(real.realFinalValue)} в сегодняшних деньгах`)}` : ''}${fx ? ` · 1 ${fx.code}: ${money(fx.startRate, priceDigits(fx.startRate))} → ${money(result.endRate, priceDigits(result.endRate))}` : ''}`} tone={gainPositive ? 'positive' : 'negative'} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label={t('Yatırdığın ana para', 'Principal you put in', 'Внесённый капитал')} value={money(result.principal)} detail={result.contributions > 0 ? (fx ? `${money(input.initial)} + ${fx.format(result.contributionsForeign)} ≈ ${money(result.contributions)} ${t('katkı', 'contributions', 'взносы')}` : `${money(input.initial)} + ${money(result.contributions)} ${t('katkı', 'contributions', 'взносы')}`) : t('tek seferlik', 'one-time', 'единовременно')} />
      <Stat label={t('Kazanç / getiri', 'Gain / return', 'Доход')} value={money(result.gain)} tone={gainPositive ? 'positive' : 'negative'} detail={t('faiz ve büyüme', 'interest and growth', 'проценты и рост')} />
      <Stat label={t('Toplam getiri', 'Total return', 'Общая доходность')} value={percent(result.totalReturnPercent)} tone={gainPositive ? 'positive' : 'negative'} detail={t('ana paraya göre', 'on principal', 'к капиталу')} />
      <Stat label={t('Aylık büyüme çarpanı', 'Monthly growth factor', 'Месячный коэффициент роста')} value={`×${formatNumber(result.monthlyFactor, language, { maximumFractionDigits: 5 })}`} detail={t(`≈ aylık ${percent((result.monthlyFactor - 1) * 100, 3)}`, `≈ ${percent((result.monthlyFactor - 1) * 100, 3)} per month`, `≈ ${percent((result.monthlyFactor - 1) * 100, 3)} в месяц`)} />
    </div>
    {real && <InflationBlock title={t(`Enflasyon etkisi · ${countryName} · yıllık ${percent(real.inflationPercent)} varsayımı`, `Inflation effect · ${countryName} · assuming ${percent(real.inflationPercent)} a year`, `Влияние инфляции · ${countryName} · при ${percent(real.inflationPercent)} в год`)} positive={real.realGain >= 0} verdict={real.realGain >= 0
      ? t(`Bu oranlarla yatırım enflasyonu yeniyor: alım gücü ${percent(real.realReturnPercent)} artıyor.`, `At these rates the investment beats inflation: purchasing power grows by ${percent(real.realReturnPercent)}.`, `При этих ставках вложение опережает инфляцию: покупательная способность растёт на ${percent(real.realReturnPercent)}.`)
      : t(`Bu oranlarla yatırım alım gücünü koruyamıyor: alım gücü ${percent(-real.realReturnPercent)} azalıyor. Enflasyonu yenmek için yıllık en az ${percent(real.inflationPercent)} efektif getiri gerekir.`, `At these rates the investment loses purchasing power: ${percent(-real.realReturnPercent)} less. Beating inflation needs at least ${percent(real.inflationPercent)} effective a year.`, `При этих ставках вложение теряет покупательную способность: минус ${percent(-real.realReturnPercent)}. Чтобы обогнать инфляцию, нужна эффективная доходность не ниже ${percent(real.inflationPercent)} в год.`)}>
      <Stat label={t('Bugünkü parayla değer', 'Value in today’s money', 'Стоимость в сегодняшних деньгах')} value={money(real.realFinalValue)} detail={t('başlangıç tarihindeki alım gücüyle', 'purchasing power at the start', 'покупательная способность на старте')} />
      <Stat label={t('Enflasyon kaybı', 'Lost to inflation', 'Потеря от инфляции')} value={money(real.inflationLoss)} tone="negative" detail={result.finalValue > 0 ? t(`nominal değere oranı ${percent((real.inflationLoss / result.finalValue) * 100)}`, `${percent((real.inflationLoss / result.finalValue) * 100)} of the nominal value`, `${percent((real.inflationLoss / result.finalValue) * 100)} номинальной стоимости`) : undefined} />
      <Stat label={t('Reel kazanç', 'Real gain', 'Реальный доход')} value={money(real.realGain)} tone={real.realGain >= 0 ? 'positive' : 'negative'} detail={t(`reel getiri ${percent(real.realReturnPercent)} · reel ana para ${money(real.realPrincipal)}`, `real return ${percent(real.realReturnPercent)} · real principal ${money(real.realPrincipal)}`, `реальная доходность ${percent(real.realReturnPercent)} · реальный капитал ${money(real.realPrincipal)}`)} />
      <Stat label={t('Reel yıllık getiri', 'Real annual return', 'Реальная годовая доходность')} value={percent(real.realAnnualPercent, 2)} tone={real.realAnnualPercent >= 0 ? 'positive' : 'negative'} detail={t(`nominal ${percent(result.effectiveAnnualPercent, 2)} · enflasyon ${percent(real.inflationPercent)}`, `nominal ${percent(result.effectiveAnnualPercent, 2)} · inflation ${percent(real.inflationPercent)}`, `номинальная ${percent(result.effectiveAnnualPercent, 2)} · инфляция ${percent(real.inflationPercent)}`)} />
    </InflationBlock>}
    <RatioBar label={t('Toplam değerin dağılımı', 'What the total is made of', 'Из чего состоит итог')} parts={[{ label: t('Başlangıç', 'Starting amount', 'Начальная сумма'), value: input.initial, color: '#5b7fe8', display: money(input.initial) }, ...(result.contributions > 0 ? [{ label: t('Katkılar', 'Contributions', 'Взносы'), value: result.contributions, color: '#9db1f2', display: money(result.contributions) }] : []), { label: gainPositive ? t('Kazanç', 'Gain', 'Доход') : t('Kayıp', 'Loss', 'Убыток'), value: Math.abs(result.gain), color: gainPositive ? '#3fb283' : '#c94f5f', display: money(result.gain) }]} />
    <LineChart language={language} ariaLabel={t('Yıllara göre büyüme: toplam değer ve yatırılan ana para', 'Growth by year: total value and principal', 'Рост по годам: итоговая стоимость и капитал')} series={[{ label: t('Toplam değer', 'Total value', 'Итоговая стоимость'), color: '#3fb283', values: result.path.map((point) => point.value) }, { label: t('Ana para', 'Principal', 'Капитал'), color: '#5b7fe8', values: result.path.map((point) => point.principal), dashed: true }, ...(real ? [{ label: t('Bugünkü parayla değer', 'Value in today’s money', 'В сегодняшних деньгах'), color: '#8f83d9', values: real.path.map((point) => point.realValue) }] : [])]} xLabels={[t('Başlangıç', 'Start', 'Старт'), ...(input.months > 24 ? [`${Math.round(input.months / 24)}. ${t('yıl', 'yr', 'г.')}`] : []), yearsText]} formatValue={(value) => money(value)} />
    <div>
      <ResultTabs label={t('Tablo görünümü', 'Table view', 'Вид таблицы')} value={view} onChange={onViewChange} options={viewOptions(t)} />
      {view === 'monthly' && <YearStrip years={result.yearly.map((row) => row.year)} value={activeYear} onChange={setYear} formatYear={yearLabel} label={t('Yıl', 'Year', 'Год')} selectLabel={t('Yıl seç', 'Choose year', 'Выбрать год')} language={language} />}
      {view === 'yearly'
        ? <DataTable headers={[t('Yıl', 'Year', 'Год'), t('Yıl başı', 'Opening', 'Начало'), ...foreignHeader, t('Katkılar', 'Contributions', 'Взносы'), t('Kazanç', 'Gain', 'Доход'), t('Yıl sonu', 'Closing', 'Конец'), t('Toplam ana para', 'Total principal', 'Всего капитала'), ...(real ? [t('Bugünkü parayla', 'Today’s money', 'В сегодняшних деньгах'), t('Enflasyon kaybı', 'Lost to inflation', 'Потеря от инфляции')] : [])]} rows={result.yearly.map((row, index) => [row.months < 12 ? `${row.year} (${row.months} ${t('ay', 'mo', 'мес.')})` : row.year, money(row.opening), ...(fx ? [row.contributionsForeign > 0 ? fx.format(row.contributionsForeign) : '—'] : []), row.contributions > 0 ? money(row.contributions) : '—', money(row.interest), money(row.closing), money(row.principal), ...(real ? [money(real.yearly[index].realClosing), money(real.yearly[index].inflationLoss)] : [])])} footer={[t('Toplam', 'Total', 'Итого'), money(input.initial), ...(fx ? [fx.format(result.contributionsForeign)] : []), result.contributions > 0 ? money(result.contributions) : '—', money(result.gain), money(result.finalValue), money(result.principal), ...(real ? [money(real.realFinalValue), money(real.inflationLoss)] : [])]} maxHeight="max-h-96" minWidth={real || fx ? 'min-w-[800px]' : 'min-w-[520px]'} />
        : <DataTable headers={[t('Ay', 'Month', 'Месяц'), t('Ay başı', 'Opening', 'Начало'), ...foreignHeader, ...(fx ? [t('Kur', 'Rate', 'Курс')] : []), t('Katkı', 'Contribution', 'Взнос'), t('Kazanç', 'Gain', 'Доход'), t('Toplam ana para', 'Principal', 'Капитал'), t('Ay sonu', 'Closing', 'Конец'), ...(real ? [t('Bugünkü parayla', 'Today’s money', 'В сегодняшних деньгах')] : [])]} rows={result.path.filter((point) => point.year === activeYear).map((point) => [`${point.index}. ${t('ay', 'month', 'месяц')}`, money(point.opening, 2), ...(fx ? [point.contributionForeign > 0 ? fx.format(point.contributionForeign) : '—', money(point.rate, priceDigits(point.rate))] : []), point.contribution > 0 ? money(point.contribution, 2) : '—', money(point.interest, 2), money(point.principal, 2), money(point.value, 2), ...realColumn(point.index - 1)])} footer={[t(`${activeYear}. yıl toplamı`, `Year ${activeYear} total`, `Итого за ${activeYear}-й год`), money(yearRow.opening, 2), ...(fx ? [yearRow.contributionsForeign > 0 ? fx.format(yearRow.contributionsForeign) : '—', '—'] : []), yearRow.contributions > 0 ? money(yearRow.contributions, 2) : '—', money(yearRow.interest, 2), money(yearRow.principal, 2), money(yearRow.closing, 2), ...(yearReal ? [money(yearReal.realClosing, 2)] : [])]} maxHeight="max-h-none" minWidth={real || fx ? 'min-w-[820px]' : 'min-w-[620px]'} />}
    </div>
  </div>
}

function HistoricalResults({ outcome, showInflation, countryName, language, t, money, percent, number, view, onViewChange }: Formatters & ViewProps & { outcome: InvestmentOutcome; showInflation: boolean; countryName: string; number: (value: number, digits: number) => string }) {
  const { asset, base, deposit, plan } = outcome
  const years = outcome.yearly.map((row) => row.year)
  const [year, setYear] = useState(outcome.end.year)
  const activeYear = years.includes(year) ? year : years[years.length - 1]
  const assetName = assetNames(asset, language)
  const units = (value: number) => `${number(value, unitDigits(asset, value))} ${unitNames(asset, language)}`
  const startText = monthLabel(outcome.start, language), endText = monthLabel(outcome.end, language)
  const contributionText = plan.kind === 'periodic-units' ? `${number(plan.amount, 2)} ${unitNames(asset, language)}` : formatMoney(plan.amount, language, outcome.contributionCurrency, 0)
  const every = outcome.frequency === 'monthly' ? t('her ay', 'every month', 'каждый месяц') : t('her yıl', 'every year', 'каждый год')
  const headline = plan.kind === 'lump'
    ? (deposit ? t(`${startText} tarihinde yatırılan ${money(plan.amount)} mevduat bugün`, `${money(plan.amount)} deposited in ${startText} is worth`, `${money(plan.amount)}, положенные на вклад в ${startText}, сегодня стоят`) : t(`${startText} tarihinde ${money(plan.amount)} ile alınan ${assetName.toLocaleLowerCase('tr')} bugün`, `${money(plan.amount)} of ${assetName.toLowerCase()} bought in ${startText} is worth`, `Покупка «${assetName.toLowerCase()}» на ${money(plan.amount)} в ${startText} сегодня стоит`))
    : t(`${startText}’ten beri ${every} ${contributionText}${plan.initial ? ` (+ başlangıçta ${money(plan.initial)})` : ''} ile ${deposit ? 'mevduat' : assetName.toLocaleLowerCase('tr')} bugün`, `${every} ${contributionText}${plan.initial ? ` (+ ${money(plan.initial)} at the start)` : ''} of ${deposit ? 'deposits' : assetName.toLowerCase()} since ${startText} is worth`, `${every} ${contributionText}${plan.initial ? ` (+ ${money(plan.initial)} в начале)` : ''} в ${deposit ? 'вклад' : assetName.toLowerCase()} с ${startText} сегодня стоят`)
  const positive = outcome.profit >= 0
  const cpiValues = useMemo(() => {
    if (!outcome.inflation) return []
    const basePath = inflationPath(1, outcome.start, base, outcome.inflation.country)
    if (!basePath.length) return []
    const factorAt = new Map(basePath.map((point) => [`${point.year}-${point.month}`, point.value]))
    const values: number[] = []
    let sum = 0
    for (const point of outcome.path) {
      const factor = factorAt.get(`${point.year}-${point.month}`)
      if (factor === undefined) break
      sum += point.contribution / factor
      values.push(sum * factor)
    }
    return values
  }, [outcome, base])
  const chartLabels = [startText, ...(outcome.path.length > 24 ? [String(outcome.path[Math.floor(outcome.path.length / 2)].year)] : []), endText]
  return <div className="mt-6 space-y-4">
    <Result label={headline} value={money(outcome.value)} detail={`${endText} · ${outcome.months} ${t('ay', 'months', 'мес.')} · ${outcome.contributions} ${t('alım', 'purchases', 'покупок')}${deposit ? ` · ${t('stopaj', 'withholding', 'налог')} ${percent(deposit.withholdingPercent, 1)}` : ` · ${t('birim fiyat', 'unit price', 'цена за единицу')} ${money(outcome.startPrice, priceDigits(outcome.startPrice))} → ${money(outcome.endPrice, priceDigits(outcome.endPrice))}`}`} tone={positive ? 'positive' : 'negative'} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <Stat label={t('Toplam yatırılan', 'Total invested', 'Всего вложено')} value={money(outcome.totalInvested)} detail={plan.kind === 'lump' ? t('tek seferlik', 'one-time', 'единовременно') : `${outcome.contributions} ${t('alım', 'purchases', 'покупок')}${outcome.contributionCurrency !== base ? ` · ${outcome.contributionCurrency} → ${base}` : ''}`} />
      <Stat label={t('Kâr / zarar', 'Profit / loss', 'Прибыль / убыток')} value={money(outcome.profit)} tone={positive ? 'positive' : 'negative'} detail={`${t('Toplam getiri', 'Total return', 'Общая доходность')} ${percent(outcome.nominalReturnPercent)}`} />
      <Stat label={t('Yıllık bileşik getiri', 'Annualised return', 'Годовая доходность')} value={percent(outcome.annualizedReturnPercent)} tone={outcome.annualizedReturnPercent !== null && outcome.annualizedReturnPercent >= 0 ? 'positive' : 'negative'} detail={plan.kind === 'lump' ? t('yıllık ortalama (CAGR)', 'compound annual rate (CAGR)', 'среднегодовой темп (CAGR)') : t('para ağırlıklı (IRR)', 'money-weighted (IRR)', 'денежно-взвешенная (IRR)')} />
      {deposit
        ? <Stat label={t('Dönem ort. yıllık faiz', 'Average annual rate', 'Средняя годовая ставка')} value={percent(deposit.averageRatePercent)} detail={t(`≈ aylık ${percent(deposit.averageRatePercent / 12, 2)} · başlangıç ${percent(deposit.startRatePercent)}, son ${percent(deposit.endRatePercent)}`, `≈ ${percent(deposit.averageRatePercent / 12, 2)} per month · start ${percent(deposit.startRatePercent)}, latest ${percent(deposit.endRatePercent)}`, `≈ ${percent(deposit.averageRatePercent / 12, 2)} в месяц · в начале ${percent(deposit.startRatePercent)}, сейчас ${percent(deposit.endRatePercent)}`)} />
        : <Stat label={t('Toplam birim', 'Total units', 'Всего единиц')} value={units(outcome.units)} detail={outcome.averageCost !== null ? `${t('ort. maliyet', 'avg. cost', 'ср. цена')} ${money(outcome.averageCost, priceDigits(outcome.averageCost))} / ${unitNames(asset, language)}` : undefined} />}
      {deposit
        ? <Stat label={t('Toplam faiz (stopaj sonrası)', 'Total interest (after withholding)', 'Всего процентов (после налога)')} value={money(deposit.totalInterest)} tone="positive" />
        : <Stat label={t('Bugünkü birim fiyat', 'Unit price today', 'Цена за единицу сегодня')} value={money(outcome.endPrice, priceDigits(outcome.endPrice))} detail={outcome.averageCost !== null ? t(`ort. maliyetin ×${number(outcome.endPrice / outcome.averageCost, 2)} katı`, `×${number(outcome.endPrice / outcome.averageCost, 2)} the average cost`, `в ${number(outcome.endPrice / outcome.averageCost, 2)} раза выше ср. цены`) : undefined} />}
      {outcome.usdReturnPercent !== null && <Stat label={t('Dolar bazında getiri', 'Return in dollars', 'Доходность в долларах')} value={percent(outcome.usdReturnPercent)} detail={t('kur etkisi hariç', 'excluding the exchange rate', 'без учёта курса')} />}
    </div>
    {showInflation && (outcome.inflation ? <InflationBlock title={t(`Enflasyon etkisi · ${countryName} TÜFE · ${startText} → ${monthLabel(outcome.inflation.through, language)}`, `Inflation effect · ${countryName} CPI · ${startText} → ${monthLabel(outcome.inflation.through, language)}`, `Влияние инфляции · ИПЦ ${countryName} · ${startText} → ${monthLabel(outcome.inflation.through, language)}`)} positive={outcome.inflation.realProfit >= 0} verdict={outcome.inflation.realProfit >= 0
      ? t(`Yatırım enflasyonu yendi: alım gücü ${percent(outcome.inflation.realReturnPercent)} arttı.`, `The investment beat inflation: purchasing power grew by ${percent(outcome.inflation.realReturnPercent)}.`, `Вложение обогнало инфляцию: покупательная способность выросла на ${percent(outcome.inflation.realReturnPercent)}.`)
      : t(`Yatırım enflasyonun gerisinde kaldı: alım gücü ${percent(-outcome.inflation.realReturnPercent)} azaldı.`, `The investment fell behind inflation: purchasing power shrank by ${percent(-outcome.inflation.realReturnPercent)}.`, `Вложение отстало от инфляции: покупательная способность снизилась на ${percent(-outcome.inflation.realReturnPercent)}.`)}>
      <Stat label={t('Dönem enflasyonu', 'Inflation over the period', 'Инфляция за период')} value={percent(outcome.inflation.periodInflationPercent)} detail={outcome.inflation.annualizedInflationPercent !== null ? t(`yıllık ortalama ${percent(outcome.inflation.annualizedInflationPercent)}`, `≈ ${percent(outcome.inflation.annualizedInflationPercent)} a year`, `≈ ${percent(outcome.inflation.annualizedInflationPercent)} в год`) : undefined} />
      <Stat label={t('Yatırdıklarının bugünkü karşılığı', 'Contributions in today’s money', 'Взносы в сегодняшних деньгах')} value={money(outcome.inflation.adjustedInvested)} detail={t(`${money(outcome.inflation.investedThrough)} yatırım, aynı alım gücü`, `${money(outcome.inflation.investedThrough)} invested, same purchasing power`, `${money(outcome.inflation.investedThrough)} вложено, та же покупательная способность`)} />
      <Stat label={t('Reel kâr / zarar', 'Real profit / loss', 'Реальная прибыль / убыток')} value={money(outcome.inflation.realProfit)} tone={outcome.inflation.realProfit >= 0 ? 'positive' : 'negative'} detail={t(`o ayki değer ${money(outcome.inflation.valueThrough)} − ${money(outcome.inflation.adjustedInvested)}`, `value that month ${money(outcome.inflation.valueThrough)} − ${money(outcome.inflation.adjustedInvested)}`, `стоимость в тот месяц ${money(outcome.inflation.valueThrough)} − ${money(outcome.inflation.adjustedInvested)}`)} />
      <Stat label={t('Enflasyona göre reel getiri', 'Real return vs. inflation', 'Реальная доходность с учётом инфляции')} value={percent(outcome.inflation.realReturnPercent)} tone={outcome.inflation.realReturnPercent >= 0 ? 'positive' : 'negative'} detail={t(`nominal ${percent(outcome.nominalReturnPercent)} · ${monthLabel(outcome.inflation.through, language)} itibarıyla`, `nominal ${percent(outcome.nominalReturnPercent)} · as of ${monthLabel(outcome.inflation.through, language)}`, `номинальная ${percent(outcome.nominalReturnPercent)} · на ${monthLabel(outcome.inflation.through, language)}`)} />
    </InflationBlock> : <Note tone="warning">{t(`${countryName} TÜFE verisi bu dönemi kapsamıyor; enflasyon karşılaştırması yapılamadı.`, `The ${countryName} CPI data does not cover this period, so no inflation comparison is possible.`, `Данные ИПЦ (${countryName}) не охватывают этот период, сравнение с инфляцией невозможно.`)}</Note>)}
    <RatioBar label={t('Bugünkü değerin dağılımı', 'What today’s value is made of', 'Из чего состоит сегодняшняя стоимость')} parts={positive ? [{ label: t('Yatırılan', 'Invested', 'Вложено'), value: outcome.totalInvested, color: '#5b7fe8', display: money(outcome.totalInvested) }, { label: t('Kazanç', 'Gain', 'Доход'), value: outcome.profit, color: '#3fb283', display: money(outcome.profit) }] : [{ label: t('Bugünkü değer', 'Value today', 'Стоимость сегодня'), value: outcome.value, color: '#5b7fe8', display: money(outcome.value) }, { label: t('Kayıp', 'Loss', 'Убыток'), value: -outcome.profit, color: '#c94f5f', display: money(-outcome.profit) }]} />
    <LineChart language={language} ariaLabel={t('Aylık değer, toplam yatırılan ve enflasyonla korunmuş yatırılan tutar', 'Monthly value, total invested and inflation-adjusted contributions', 'Стоимость по месяцам, всего вложено и взносы с поправкой на инфляцию')} series={[{ label: t('Bugünkü değer', 'Value', 'Стоимость'), color: '#e0a03a', values: outcome.path.map((point) => point.value) }, { label: t('Toplam yatırılan', 'Total invested', 'Всего вложено'), color: '#5b7fe8', values: outcome.path.map((point) => point.invested), dashed: true }, ...(showInflation && cpiValues.length > 1 ? [{ label: t('Enflasyonla korunmuş yatırılan', 'Inflation-adjusted invested', 'Вложено с поправкой на инфляцию'), color: '#8f83d9', values: cpiValues, dashed: true }] : [])]} xLabels={chartLabels} formatValue={(value) => money(value)} />
    <div>
      <ResultTabs label={t('Tablo görünümü', 'Table view', 'Вид таблицы')} value={view} onChange={onViewChange} options={viewOptions(t)} />
      {deposit && <p className="mt-2 text-[.72rem] text-[#7a8699]">{t('Bakiye, o ayın faizi eklendikten sonraki ay sonu bakiyesidir.', 'Balances are month-end figures after that month’s interest.', 'Остатки указаны на конец месяца после начисления процентов.')}</p>}
      {view === 'monthly' && <YearStrip years={years} value={activeYear} onChange={setYear} label={t('Yıl', 'Year', 'Год')} selectLabel={t('Yıl seç', 'Choose year', 'Выбрать год')} language={language} />}
      {view === 'yearly'
        ? <DataTable headers={[t('Yıl', 'Year', 'Год'), t('O yıl yatırılan', 'Invested that year', 'Вложено за год'), t('Toplam yatırılan', 'Total invested', 'Всего вложено'), deposit ? t('O yıl faiz', 'Interest that year', 'Проценты за год') : t('Toplam birim', 'Total units', 'Всего единиц'), t('Yıl sonu değeri', 'Year-end value', 'Стоимость на конец года'), t('Getiri (kümülatif)', 'Return (cumulative)', 'Доходность (накопленная)')]} rows={outcome.yearly.map((row) => [row.year, row.invested > 0 ? money(row.invested) : '—', money(row.cumulativeInvested), deposit ? money(row.interest) : units(row.units), money(row.value), percent(row.returnPercent)])} footer={[t('Toplam', 'Total', 'Итого'), money(outcome.totalInvested), money(outcome.totalInvested), deposit ? money(deposit.totalInterest) : units(outcome.units), money(outcome.value), percent(outcome.nominalReturnPercent)]} maxHeight="max-h-96" />
        : <HistoricalMonthTable year={activeYear} points={outcome.path.filter((point) => point.year === activeYear)} asset={asset} deposit={Boolean(deposit)} language={language} t={t} money={money} percent={percent} number={number} />}
    </div>
  </div>
}

function HistoricalMonthTable({ year, points, asset, deposit, language, t, money, percent, number }: Formatters & { year: number; points: InvestmentPoint[]; asset: AssetId; deposit: boolean; number: (value: number, digits: number) => string }) {
  const last = points[points.length - 1]
  const investedThisYear = points.reduce((sum, point) => sum + point.contribution, 0)
  const interestThisYear = points.reduce((sum, point) => sum + point.interest, 0)
  const unitsThisYear = points.reduce((sum, point) => sum + point.unitsBought, 0)
  const averageRate = points.reduce((sum, point) => sum + point.price, 0) / Math.max(1, points.length)
  const mark = (point: InvestmentPoint, text: string) => (point.estimated ? `≈ ${text}` : text)
  const totalLabel = t(`${year} toplamı`, `${year} total`, `Итого за ${year}`)
  const headers = deposit
    ? [t('Ay', 'Month', 'Месяц'), t('Yıllık faiz', 'Annual rate', 'Годовая ставка'), t('Yatırılan', 'Invested', 'Вложено'), t('Faiz', 'Interest', 'Проценты'), t('Toplam yatırılan', 'Total invested', 'Всего вложено'), t('Bakiye', 'Balance', 'Остаток'), t('Kâr', 'Profit', 'Прибыль')]
    : [t('Ay', 'Month', 'Месяц'), t('Birim fiyat', 'Unit price', 'Цена за единицу'), t('Yatırılan', 'Invested', 'Вложено'), t('Alınan', 'Bought', 'Куплено'), t('Toplam birim', 'Total units', 'Всего единиц'), t('Toplam yatırılan', 'Total invested', 'Всего вложено'), t('Değer', 'Value', 'Стоимость'), t('Kâr / zarar', 'Profit / loss', 'Прибыль / убыток')]
  const rows = points.map((point) => deposit
    ? [monthName(point.month - 1, language, 'long'), mark(point, percent(point.price, 2)), point.contribution > 0 ? money(point.contribution) : '—', money(point.interest, 2), money(point.invested), money(point.value, 2), money(point.value - point.invested, 2)]
    : [monthName(point.month - 1, language, 'long'), mark(point, money(point.price, priceDigits(point.price))), point.contribution > 0 ? money(point.contribution) : '—', point.unitsBought > 0 ? number(point.unitsBought, unitDigits(asset, point.unitsBought)) : '—', number(point.units, unitDigits(asset, point.units)), money(point.invested), money(point.value), money(point.value - point.invested)])
  const footer = deposit
    ? [totalLabel, `${t('ort.', 'avg.', 'ср.')} ${percent(averageRate, 2)}`, investedThisYear > 0 ? money(investedThisYear) : '—', money(interestThisYear, 2), money(last.invested), money(last.value, 2), money(last.value - last.invested, 2)]
    : [totalLabel, unitsThisYear > 0 ? `${t('ort.', 'avg.', 'ср.')} ${money(investedThisYear / unitsThisYear, priceDigits(investedThisYear / unitsThisYear))}` : '—', investedThisYear > 0 ? money(investedThisYear) : '—', unitsThisYear > 0 ? number(unitsThisYear, unitDigits(asset, unitsThisYear)) : '—', number(last.units, unitDigits(asset, last.units)), money(last.invested), money(last.value), money(last.value - last.invested)]
  const estimatedMonths = points.filter((point) => point.estimated).length
  return <>
    <DataTable headers={headers} rows={rows} footer={footer} maxHeight="max-h-none" minWidth={deposit ? 'min-w-[620px]' : 'min-w-[720px]'} />
    {estimatedMonths > 0 && <p className="mt-2 text-[.68rem] text-[#94a0b4]">{t(`≈ ${estimatedMonths} ayda kaynak veri yayımlamadı; bir önceki ayın ${deposit ? 'faizi' : 'fiyatı'} kullanıldı.`, `≈ ${estimatedMonths} months had no published value; the previous month's ${deposit ? 'rate' : 'price'} was used.`, `≈ ${estimatedMonths} мес. без опубликованных данных; использовано значение предыдущего месяца.`)}</p>}
  </>
}

/** Tinted panel that keeps the inflation-adjusted figures visibly separate from the nominal ones. */
function InflationBlock({ title, verdict, positive, children }: { title: string; verdict: string; positive: boolean; children: React.ReactNode }) {
  return <section aria-label={title} className="inflation-block">
    <p className="inflation-block-title">{title}</p>
    <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4 [&>div]:bg-white">{children}</div>
    <p className={`mt-3 text-[.74rem] font-semibold ${positive ? 'text-[#25865a]' : 'text-[#c94f5f]'}`}>{verdict}</p>
  </section>
}
