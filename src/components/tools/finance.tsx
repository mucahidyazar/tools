'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from '@/hooks/use-language'
import { formatMoney, formatNumber, formatPercent } from '@/lib/format'
import { loanAmortization, percentageCalculation, vat, type PercentageMode } from '@/lib/calculations'
import { currencyOptions, DataTable, Disclosure, Field, Note, Panel, RatioBar, Result, Segmented, Select, Stat } from './shared'

const COLORS = { principal: '#5b7fe8', contributions: '#9db1f2', interest: '#3fb283', tax: '#e7a052', net: '#39b27b', deduction: '#c94f5f' }

function useSecondaryCurrency(primary: string) {
  const [secondary, setSecondary] = useState('USD')
  const [conversion, setConversion] = useState('0.021')
  const factor = Number(conversion) > 0 ? Number(conversion) : 0
  return { secondary, setSecondary, conversion, setConversion, factor, differs: secondary !== primary && factor > 0 }
}

export function LoanTool() {
  const { language, t } = useTranslation()
  const [amount, setAmount] = useState('500000')
  const [rate, setRate] = useState('3.25')
  const [rateKind, setRateKind] = useState<'monthly' | 'annual'>('monthly')
  const [months, setMonths] = useState('36')
  const [interestTax, setInterestTax] = useState('0')
  const [currency, setCurrency] = useState('TRY')
  const [details, setDetails] = useState(false)
  const second = useSecondaryCurrency(currency)
  const annualRate = (rateKind === 'monthly' ? Number(rate) * 12 : Number(rate)) * (1 + Math.max(0, Number(interestTax)) / 100)
  const calc = useMemo(() => loanAmortization(Number(amount), annualRate, Number(months)), [amount, annualRate, months])
  const money = (value: number, code = currency, digits = 0) => formatMoney(value, language, code, digits)
  const converted = (value: number) => (second.differs ? `≈ ${money(value * second.factor, second.secondary, 2)}` : undefined)
  const options = currencyOptions(language)
  return <Panel>
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field name="amount" label={t('Kredi tutarı', 'Loan amount', 'Сумма кредита')} value={amount} onChange={setAmount} suffix={currency} min="0" /></div>
        <Field name="rate" label={rateKind === 'monthly' ? t('Aylık faiz oranı', 'Monthly interest rate', 'Месячная ставка') : t('Yıllık faiz oranı', 'Annual interest rate', 'Годовая ставка')} value={rate} onChange={setRate} suffix="%" min="0" />
        <div className="self-end"><Segmented name="rateKind" label={t('Faiz türü', 'Rate type', 'Тип ставки')} value={rateKind} onChange={setRateKind} options={[{ value: 'monthly', label: t('Aylık', 'Monthly', 'Месячная') }, { value: 'annual', label: t('Yıllık', 'Annual', 'Годовая') }]} /></div>
        <Field name="months" label={t('Vade', 'Term', 'Срок')} value={months} onChange={setMonths} suffix={t('ay', 'months', 'мес.')} min="1" max="480" step="1" />
        <Field name="interestTax" label={t('Faiz üzerindeki vergiler', 'Taxes on interest', 'Налоги на проценты')} value={interestTax} onChange={setInterestTax} suffix="%" min="0" hint={t('Türkiye’de ihtiyaç kredilerinde KKDF %15 + BSMV %15 = %30 uygulanır; konut kredisi muaftır.', 'Turkish consumer loans carry KKDF 15% + BSMV 15% = 30%; mortgages are exempt.', 'Потребительские кредиты в Турции облагаются KKDF 15% + BSMV 15% = 30%; ипотека освобождена.')} />
        <Select name="currency" label={t('Para birimi', 'Currency', 'Валюта')} value={currency} onChange={setCurrency} options={options} />
        <Select name="secondary" label={t('İkinci para birimi', 'Secondary currency', 'Вторая валюта')} value={second.secondary} onChange={second.setSecondary} options={options} />
        <div className="sm:col-span-2"><Field name="conversion" label={t('Dönüşüm oranı', 'Conversion rate', 'Курс пересчёта')} value={second.conversion} onChange={second.setConversion} min="0" hint={t(`1 ${currency} = ? ${second.secondary}`, `1 ${currency} = ? ${second.secondary}`, `1 ${currency} = ? ${second.secondary}`)} /></div>
      </div>
      <div className="grid content-start gap-3">
        <Result label={t('Aylık taksit', 'Monthly payment', 'Ежемесячный платёж')} value={money(calc.payment, currency, 2)} detail={[converted(calc.payment), `${t('Toplam geri ödeme', 'Total repayment', 'Всего к выплате')}: ${money(calc.totalPaid)}`].filter(Boolean).join(' · ')} />
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t('Toplam faiz', 'Total interest', 'Всего процентов')} value={money(calc.totalInterest)} tone="negative" detail={converted(calc.totalInterest)} />
          <Stat label={t('Efektif aylık oran', 'Effective monthly rate', 'Эффективная месячная ставка')} value={formatPercent(annualRate / 12, language, 3)} detail={Number(interestTax) > 0 ? t('vergiler dahil', 'including taxes', 'с налогами') : undefined} />
          <Stat label={t('Faizin ana paraya oranı', 'Interest to principal', 'Проценты к телу кредита')} value={formatPercent(Number(amount) > 0 ? (calc.totalInterest / Number(amount)) * 100 : 0, language, 1)} />
          <Stat label={t('Son taksit', 'Final payment', 'Последний платёж')} value={money(calc.schedule.at(-1)?.payment ?? 0, currency, 2)} />
        </div>
        <RatioBar label={t('Toplam geri ödemenin dağılımı', 'What you pay back', 'Из чего состоит выплата')} parts={[{ label: t('Ana para', 'Principal', 'Тело кредита'), value: Number(amount) || 0, color: COLORS.principal, display: money(Number(amount) || 0) }, { label: t('Faiz', 'Interest', 'Проценты'), value: calc.totalInterest, color: COLORS.deduction, display: money(calc.totalInterest) }]} />
      </div>
    </div>
    <Disclosure open={details} onToggle={() => setDetails((value) => !value)} openLabel={t('Ödeme planını gizle', 'Hide repayment schedule', 'Скрыть график платежей')} closedLabel={t('Ödeme planını göster', 'Show repayment schedule', 'Показать график платежей')} controls="loan-schedule" />
    {details && <DataTable id="loan-schedule" headers={[t('Ay', 'Month', 'Месяц'), t('Taksit', 'Payment', 'Платёж'), t('Ana para', 'Principal', 'Тело кредита'), t('Faiz', 'Interest', 'Проценты'), ...(second.differs ? [`${t('Taksit', 'Payment', 'Платёж')} (${second.secondary})`] : []), t('Kalan borç', 'Balance', 'Остаток')]} rows={calc.schedule.map((row) => [row.month, money(row.payment, currency, 2), money(row.principal, currency, 2), money(row.interest, currency, 2), ...(second.differs ? [money(row.payment * second.factor, second.secondary, 2)] : []), money(row.balance, currency, 2)])} />}
    <Note>{t('Eşit taksitli (annüite) plan varsayılır. Dosya masrafı, sigorta ve ekspertiz gibi ek ücretler dahil değildir.', 'Assumes an equal-instalment (annuity) schedule. Arrangement fees, insurance and appraisal costs are not included.', 'Предполагается аннуитетный график. Комиссии, страховка и оценка не учитываются.')}</Note>
  </Panel>
}

export function VatTool() {
  const { language, t } = useTranslation()
  const [amount, setAmount] = useState('1000')
  const [rate, setRate] = useState('20')
  const [mode, setMode] = useState<'add' | 'remove'>('add')
  const [currency, setCurrency] = useState('TRY')
  const calc = vat(Number(amount), Number(rate), mode)
  const money = (value: number) => formatMoney(value, language, currency, 2)
  return <Panel>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field name="amount" label={mode === 'add' ? t('KDV hariç tutar', 'Amount before VAT', 'Сумма без НДС') : t('KDV dahil tutar', 'Amount including VAT', 'Сумма с НДС')} value={amount} onChange={setAmount} suffix={currency} min="0" />
      <Field name="rate" label={t('KDV oranı', 'VAT rate', 'Ставка НДС')} value={rate} onChange={setRate} suffix="%" min="0" />
      <div className="self-end"><Segmented name="mode" label={t('İşlem', 'Operation', 'Операция')} value={mode} onChange={setMode} options={[{ value: 'add', label: t('KDV ekle', 'Add VAT', 'Добавить НДС') }, { value: 'remove', label: t('KDV çıkar', 'Remove VAT', 'Выделить НДС') }]} /></div>
      <Select name="currency" label={t('Para birimi', 'Currency', 'Валюта')} value={currency} onChange={setCurrency} options={currencyOptions(language).filter((option) => option.value !== 'GOLD')} />
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[.7rem] text-[#7d89a0]"><span>{t('Türkiye oranları:', 'Turkish rates:', 'Ставки в Турции:')}</span>{['1', '10', '20'].map((preset) => <button key={preset} type="button" onClick={() => setRate(preset)} aria-pressed={rate === preset} className={`focus-ring rounded-full border px-3 py-1 font-semibold transition ${rate === preset ? 'border-[#6d8ce1] bg-[#eaf0ff] text-[#365fbf]' : 'border-[#e3e8f1] bg-white text-[#5b6a86] hover:border-[#bdcbee]'}`}>%{preset}</button>)}</div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <Result label={t('KDV hariç (net)', 'Net (before VAT)', 'Без НДС (нетто)')} value={money(calc.net)} tone="neutral" />
      <Result label={`${t('KDV', 'VAT', 'НДС')} (${formatPercent(Number(rate) || 0, language, 0)})`} value={money(calc.tax)} tone="negative" />
      <Result label={t('KDV dahil (brüt)', 'Gross (including VAT)', 'С НДС (брутто)')} value={money(calc.gross)} />
    </div>
  </Panel>
}

export function PercentageTool() {
  const { language, t } = useTranslation()
  const [mode, setMode] = useState<PercentageMode>('of')
  const [a, setA] = useState('200')
  const [b, setB] = useState('25')
  const calc = percentageCalculation(mode, Number(a), Number(b))
  const number = (value: number) => formatNumber(value, language, { maximumFractionDigits: 4 })
  const percent = (value: number) => formatPercent(value, language, 2)
  const labels: Record<PercentageMode, { a: string; b: string; sentence: string; value: string }> = {
    of: { a: t('Sayı', 'Number', 'Число'), b: t('Yüzde', 'Percent', 'Процент'), sentence: t(`${number(Number(a) || 0)} sayısının %${b || 0}’i`, `${b || 0}% of ${number(Number(a) || 0)}`, `${b || 0}% от ${number(Number(a) || 0)}`), value: number(calc.result) },
    change: { a: t('Başlangıç değeri', 'From', 'От'), b: t('Bitiş değeri', 'To', 'До'), sentence: t(`${number(Number(a) || 0)} → ${number(Number(b) || 0)} değişimi`, `Change from ${number(Number(a) || 0)} to ${number(Number(b) || 0)}`, `Изменение от ${number(Number(a) || 0)} до ${number(Number(b) || 0)}`), value: calc.valid ? percent(calc.result) : t('Başlangıç sıfır olamaz', 'The start cannot be zero', 'Начальное значение не может быть нулём') },
    increase: { a: t('Sayı', 'Number', 'Число'), b: t('Artış yüzdesi', 'Increase by', 'Увеличить на'), sentence: t(`${number(Number(a) || 0)} sayısının %${b || 0} artmış hali`, `${number(Number(a) || 0)} increased by ${b || 0}%`, `${number(Number(a) || 0)} плюс ${b || 0}%`), value: number(calc.result) },
    decrease: { a: t('Sayı', 'Number', 'Число'), b: t('Azalış yüzdesi', 'Decrease by', 'Уменьшить на'), sentence: t(`${number(Number(a) || 0)} sayısının %${b || 0} azalmış hali`, `${number(Number(a) || 0)} decreased by ${b || 0}%`, `${number(Number(a) || 0)} минус ${b || 0}%`), value: number(calc.result) },
    ratio: { a: t('Parça', 'Part', 'Часть'), b: t('Bütün', 'Whole', 'Целое'), sentence: t(`${number(Number(a) || 0)}, ${number(Number(b) || 0)} sayısının yüzde kaçı?`, `${number(Number(a) || 0)} is what percent of ${number(Number(b) || 0)}?`, `Сколько процентов ${number(Number(a) || 0)} составляет от ${number(Number(b) || 0)}?`), value: calc.valid ? percent(calc.result) : t('Bütün sıfır olamaz', 'The whole cannot be zero', 'Целое не может быть нулём') },
  }
  return <Panel>
    <Segmented name="mode" label={t('Hesap türü', 'Calculation', 'Тип расчёта')} value={mode} onChange={setMode} options={[{ value: 'of', label: t('X’in %P’si', 'P% of X', 'P% от X') }, { value: 'change', label: t('Değişim %', 'Change %', 'Изменение %') }, { value: 'increase', label: t('% artır', 'Increase', 'Увеличить') }, { value: 'decrease', label: t('% azalt', 'Decrease', 'Уменьшить') }, { value: 'ratio', label: t('Oran %', 'Ratio %', 'Доля %') }]} />
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field name="a" label={labels[mode].a} value={a} onChange={setA} />
      <Field name="b" label={labels[mode].b} value={b} onChange={setB} suffix={mode === 'change' || mode === 'ratio' ? undefined : '%'} />
    </div>
    <div className="mt-6"><Result label={labels[mode].sentence} value={labels[mode].value} /></div>
  </Panel>
}
