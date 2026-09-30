'use client'

import { useMemo, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from '@/hooks/use-language'
import { formatMoney, formatPercent, monthName } from '@/lib/format'
import { grossToNet, SALARY_PARAMETERS_2025 } from '@/lib/salary'
import { computeAnnual, COUNTRY_MODELS, monthlyGrossForNet, SALARY_COUNTRIES, type CountryOptions, type SalaryCountry } from '@/lib/salary-countries'
import { DataTable, Disclosure, Field, Note, Panel, RatioBar, Result, Segmented, Select, Stat } from './shared'

const LINE_COLORS: Record<string, string> = { net: '#39b27b', social: '#5b7fe8', health: '#7fa5f0', income: '#e7a052', stamp: '#c94f5f', state: '#d98b6b', solidarity: '#c94f5f', church: '#b46fc9', other: '#98a4b8' }

export function SalaryTool() {
  const { language, t } = useTranslation()
  const [country, setCountry] = useState<SalaryCountry>('TR')
  const [direction, setDirection] = useState<'gross' | 'net'>('gross')
  const [amount, setAmount] = useState('60000')
  const [exemption, setExemption] = useState(true)
  const [month, setMonth] = useState('1')
  const [stateTax, setStateTax] = useState('0')
  const [churchTax, setChurchTax] = useState(false)
  const [childless, setChildless] = useState(false)
  const [customSocial, setCustomSocial] = useState('15')
  const [customIncome, setCustomIncome] = useState('20')
  const [customOther, setCustomOther] = useState('0')
  const [customCurrency, setCustomCurrency] = useState('USD')
  const [details, setDetails] = useState(false)
  const model = COUNTRY_MODELS[country]
  const currency = country === 'CUSTOM' ? (customCurrency.trim().toUpperCase().slice(0, 4) || 'USD') : model.currency
  const options: CountryOptions = useMemo(() => ({ minimumWageExemption: exemption, stateTaxPercent: Number(stateTax) || 0, churchTax, childless, customSocialPercent: Number(customSocial) || 0, customIncomeTaxPercent: Number(customIncome) || 0, customOtherPercent: Number(customOther) || 0 }), [exemption, stateTax, churchTax, childless, customSocial, customIncome, customOther])
  const monthlyGross = useMemo(() => (direction === 'gross' ? Math.max(0, Number(amount) || 0) : monthlyGrossForNet(country, Number(amount) || 0, options)), [direction, amount, country, options])
  const annual = useMemo(() => computeAnnual(country, monthlyGross, options), [country, monthlyGross, options])
  const turkish = useMemo(() => (country === 'TR' ? grossToNet(monthlyGross, SALARY_PARAMETERS_2025, { minimumWageExemption: exemption }) : null), [country, monthlyGross, exemption])
  const monthIndex = Math.min(12, Math.max(1, Number(month) || 1))
  const money = (value: number, digits = 2) => formatMoney(value, language, currency, digits)
  const monthlyNet = turkish ? turkish.months[monthIndex - 1].net : annual.net / 12
  const monthLabel = (index: number) => monthName(index - 1, language, 'long')
  const selectedMonth = turkish?.months[monthIndex - 1]
  // Türkiye shows the selected month (brackets climb through the year); other models show a twelfth of the annual figures.
  const monthlyLines = selectedMonth
    ? [{ key: 'social', label: annual.lines[0].label, amount: selectedMonth.sgk + selectedMonth.unemployment }, { key: 'income', label: annual.lines[1].label, amount: selectedMonth.incomeTax }, { key: 'stamp', label: annual.lines[2].label, amount: selectedMonth.stampTax }]
    : annual.lines.map((line) => ({ ...line, amount: line.amount / 12 }))
  const monthlyGrossShown = monthlyGross
  const scopeLabel = turkish ? monthLabel(monthIndex) : t('aylık ort.', 'monthly avg.', 'ср. в месяц')
  const changeCountry = (next: string) => { setCountry(next as SalaryCountry); if (next === 'TR') setAmount(direction === 'gross' ? '60000' : '45000'); else if (next === 'CUSTOM') setAmount('5000'); else setAmount(direction === 'gross' ? (next === 'US' ? '6000' : next === 'GB' ? '3500' : '5000') : (next === 'US' ? '4500' : next === 'GB' ? '2800' : '3200')) }
  return <Panel>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2 lg:col-span-2"><Select name="country" label={t('Ülke / model', 'Country / model', 'Страна / модель')} value={country} onChange={changeCountry} options={SALARY_COUNTRIES.map((code) => ({ value: code, label: `${COUNTRY_MODELS[code].name[language]} · ${COUNTRY_MODELS[code].year}` }))} /></div>
      <div className="self-end sm:col-span-2 lg:col-span-2"><Segmented name="direction" label={t('Hesap yönü', 'Direction', 'Направление')} value={direction} onChange={setDirection} options={[{ value: 'gross', label: t('Brütten nete', 'Gross → net', 'Брутто → нетто') }, { value: 'net', label: t('Netten brüte', 'Net → gross', 'Нетто → брутто') }]} /></div>
      <div className="sm:col-span-2"><Field name="amount" label={direction === 'gross' ? t('Aylık brüt maaş', 'Monthly gross salary', 'Месячная зарплата брутто') : t('Hedef aylık net maaş', 'Target monthly net salary', 'Желаемая месячная зарплата нетто')} value={amount} onChange={setAmount} suffix={currency} min="0" hint={direction === 'net' && country === 'TR' ? t(`${monthLabel(monthIndex)} ayı neti hedeflenir.`, `Targets the ${monthLabel(monthIndex)} net.`, `Цель — нетто за ${monthLabel(monthIndex)}.`) : direction === 'net' ? t('Yıllık ortalama aylık net hedeflenir.', 'Targets the average monthly net over a year.', 'Цель — средняя месячная зарплата нетто за год.') : undefined} /></div>
      {country === 'TR' && <Select name="month" label={t('Ay', 'Month', 'Месяц')} value={String(monthIndex)} onChange={setMonth} options={Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: monthLabel(index + 1) }))} />}
      {country === 'US' && <Field name="stateTax" label={t('Eyalet + yerel vergi', 'State + local tax', 'Налог штата + местный')} value={stateTax} onChange={setStateTax} suffix="%" min="0" max="20" hint={t('Örn. Teksas 0, New York ~6, Kaliforniya ~8.', 'e.g. Texas 0, New York ~6, California ~8.', 'напр. Техас 0, Нью-Йорк ~6, Калифорния ~8.')} />}
      {country === 'CUSTOM' && <><Field name="customSocial" label={t('Sosyal güvenlik (çalışan)', 'Social security (employee)', 'Соцстрахование (работник)')} value={customSocial} onChange={setCustomSocial} suffix="%" min="0" max="60" /><Field name="customIncome" label={t('Gelir vergisi (sabit)', 'Income tax (flat)', 'Подоходный налог (плоский)')} value={customIncome} onChange={setCustomIncome} suffix="%" min="0" max="80" /><Field name="customOther" label={t('Diğer kesintiler', 'Other deductions', 'Прочие удержания')} value={customOther} onChange={setCustomOther} suffix="%" min="0" max="60" /><Field name="customCurrency" type="text" label={t('Para birimi', 'Currency', 'Валюта')} value={customCurrency} onChange={setCustomCurrency} placeholder="USD" /></>}
    </div>
    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
      {country === 'TR' && <Checkbox name="exemption" label={t('Asgari ücret gelir ve damga vergisi istisnasını uygula', 'Apply the minimum-wage income and stamp tax exemption', 'Применить освобождение от подоходного и гербового сбора в размере минимальной зарплаты')} checked={exemption} onCheckedChange={setExemption} />}
      {country === 'DE' && <><Checkbox name="churchTax" label={t('Kilise vergisi (%9)', 'Church tax (9%)', 'Церковный налог (9%)')} checked={churchTax} onCheckedChange={setChurchTax} /><Checkbox name="childless" label={t('Çocuksuz (bakım sigortası +%0,6)', 'No children (care insurance +0.6%)', 'Без детей (страхование по уходу +0,6%)')} checked={childless} onCheckedChange={setChildless} /></>}
    </div>

    <div className="mt-6 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
      <Result label={direction === 'gross' ? (turkish ? t(`${monthLabel(monthIndex)} net maaşı`, `${monthLabel(monthIndex)} net salary`, `Нетто за ${monthLabel(monthIndex)}`) : t('Aylık net maaş', 'Monthly net salary', 'Месячная зарплата нетто')) : t('Gerekli aylık brüt maaş', 'Required monthly gross salary', 'Необходимая месячная зарплата брутто')} value={money(direction === 'gross' ? monthlyNet : monthlyGross)} detail={direction === 'gross' ? `${t('Brüt', 'Gross', 'Брутто')} ${money(monthlyGross)} · ${t('Yıllık net', 'Annual net', 'Нетто за год')} ${money(annual.net, 0)}` : `${t('Net', 'Net', 'Нетто')} ${money(monthlyNet)} · ${t('Yıllık brüt', 'Annual gross', 'Брутто за год')} ${money(annual.gross, 0)}`} />
      <div className="grid grid-cols-2 gap-3">
        {monthlyLines.map((line) => <Stat key={line.key} label={`${line.label[language]} · ${scopeLabel}`} value={money(line.amount)} tone="negative" detail={`${formatPercent(monthlyGrossShown > 0 ? (line.amount / monthlyGrossShown) * 100 : 0, language, 1)} ${t('brütün', 'of gross', 'от брутто')}`} />)}
        <Stat label={t('Efektif kesinti oranı', 'Effective deduction rate', 'Эффективная ставка удержаний')} value={formatPercent(annual.gross > 0 ? (1 - annual.net / annual.gross) * 100 : 0, language, 1)} detail={t('yıllık toplam', 'annual total', 'за год')} />
      </div>
    </div>
    <div className="mt-3"><RatioBar label={turkish ? t(`${monthLabel(monthIndex)} brüt maaşının dağılımı`, `Where the ${monthLabel(monthIndex)} gross goes`, `Куда уходит брутто за ${monthLabel(monthIndex)}`) : t('Brüt maaşın dağılımı (yıllık)', 'Where the gross salary goes (annual)', 'Куда уходит зарплата брутто (за год)')} parts={turkish ? [{ label: t('Net', 'Net', 'Нетто'), value: monthlyNet, color: LINE_COLORS.net, display: money(monthlyNet, 0) }, ...monthlyLines.map((line) => ({ label: line.label[language], value: line.amount, color: LINE_COLORS[line.key] ?? LINE_COLORS.other, display: money(line.amount, 0) }))] : [{ label: t('Net', 'Net', 'Нетто'), value: annual.net, color: LINE_COLORS.net, display: money(annual.net, 0) }, ...annual.lines.map((line) => ({ label: line.label[language], value: line.amount, color: LINE_COLORS[line.key] ?? LINE_COLORS.other, display: money(line.amount, 0) }))]} /></div>

    {turkish && <>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label={t('Ocak neti', 'January net', 'Нетто в январе')} value={money(turkish.months[0].net)} tone="positive" />
        <Stat label={t('Aralık neti', 'December net', 'Нетто в декабре')} value={money(turkish.months[11].net)} detail={t('Vergi dilimleri yıl içinde yükselir', 'Tax brackets rise through the year', 'Налоговые ступени растут в течение года')} />
        <Stat label={t('Aylık ortalama net', 'Average monthly net', 'Средняя месячная нетто')} value={money(turkish.averageNet)} />
      </div>
      <Disclosure open={details} onToggle={() => setDetails((value) => !value)} openLabel={t('Aylık tabloyu gizle', 'Hide monthly table', 'Скрыть таблицу по месяцам')} closedLabel={t('12 aylık tabloyu göster', 'Show the 12-month table', 'Показать таблицу за 12 месяцев')} controls="salary-table" />
      {details && <DataTable id="salary-table" headers={[t('Ay', 'Month', 'Месяц'), t('Brüt', 'Gross', 'Брутто'), t('SGK + işsizlik', 'Social security', 'Соцстрахование'), t('Gelir vergisi', 'Income tax', 'Подоходный налог'), t('Damga', 'Stamp', 'Гербовый сбор'), t('Net', 'Net', 'Нетто')]} rows={turkish.months.map((row) => [monthLabel(row.month), money(row.gross), money(row.sgk + row.unemployment), money(row.incomeTax), money(row.stampTax), money(row.net)])} />}
    </>}

    <Note>{t('Varsayımlar', 'Assumptions', 'Допущения')} ({model.year}): {model.assumptions[language]} {t('Kaynak', 'Source', 'Источник')}: {model.source[language]}. {t('Sonuçlar tahminidir; bordronuz için işvereninize veya bir mali müşavire danışın.', 'Results are estimates; check your payslip with your employer or an accountant.', 'Результаты являются оценкой; сверьте расчётный листок с работодателем или бухгалтером.')}</Note>
    {model.year < new Date().getFullYear() && country !== 'CUSTOM' && <Note tone="warning">{t(`${new Date().getFullYear()} parametreleri bu modele henüz eklenmedi; sonuçlar ${model.year} tarifesine göredir.`, `The ${new Date().getFullYear()} parameters are not in this model yet; results follow the ${model.year} schedule.`, `Параметры ${new Date().getFullYear()} года ещё не добавлены в эту модель; результаты соответствуют шкале ${model.year} года.`)}</Note>}
  </Panel>
}
