'use client'

import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { DateField } from '@/components/ui/date-field'
import { useTranslation } from '@/hooks/use-language'
import { formatNumber, todayIso, type Language } from '@/lib/format'
import { bmi, bmiCategory, BMI_THRESHOLDS, convertUnit, dateDifference, healthyWeightRange, tdee, weekdaysBetween, type UnitKind } from '@/lib/calculations'
import { Field, Note, Panel, Result, Segmented, Select, Stat } from './shared'

export function AgeTool() { return <DateTool /> }
export function DateDifferenceTool() { return <DateTool difference /> }

function DateTool({ difference = false }: { difference?: boolean }) {
  const { language, t } = useTranslation()
  const [first, setFirst] = useState(difference ? '2024-01-01' : '1995-05-15')
  const [second, setSecond] = useState(() => todayIso())
  const result = dateDifference(first, second)
  const weekdays = weekdaysBetween(first, second)
  const number = (value: number) => formatNumber(value, language, { maximumFractionDigits: 0 })
  const nextBirthday = (() => {
    if (difference || !result.valid) return null
    const birth = new Date(`${first}T12:00:00`), reference = new Date(`${second}T12:00:00`)
    const next = new Date(reference.getFullYear(), birth.getMonth(), birth.getDate(), 12)
    if (next < reference) next.setFullYear(next.getFullYear() + 1)
    return Math.round((next.getTime() - reference.getTime()) / 86400000)
  })()
  return <Panel>
    <div className="grid gap-4 sm:grid-cols-2">
      <DateField name="start" label={difference ? t('Başlangıç tarihi', 'Start date', 'Дата начала') : t('Doğum tarihi', 'Date of birth', 'Дата рождения')} value={first} onChange={setFirst} maxYear={new Date().getFullYear() + 50} todayButton />
      <DateField name="end" label={difference ? t('Bitiş tarihi', 'End date', 'Дата окончания') : t('Hesaplama tarihi', 'Reference date', 'Дата расчёта')} value={second} onChange={setSecond} maxYear={new Date().getFullYear() + 100} todayButton />
    </div>
    {!result.valid ? <Note tone="warning">{t('Geçerli iki tarih seç.', 'Choose two valid dates.', 'Выберите две корректные даты.')}</Note> : <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <Result label={difference ? t('Toplam süre', 'Total time', 'Общий срок') : t('Yaş', 'Age', 'Возраст')} value={difference ? `${number(Math.abs(result.days))} ${t('gün', 'days', 'дн.')}` : `${number(Math.max(0, result.years))} ${t('yıl', 'years', 'лет')}`} detail={difference ? `${number(Math.abs(result.years))} ${t('yıl', 'years', 'лет')} ${result.remainingMonths ?? 0} ${t('ay', 'months', 'мес.')} ${result.remainingDays ?? 0} ${t('gün', 'days', 'дн.')}` : `${Math.max(0, result.remainingMonths ?? 0)} ${t('ay', 'months', 'мес.')} ${Math.max(0, result.remainingDays ?? 0)} ${t('gün', 'days', 'дн.')}`} />
      <Stat label={t('Toplam ay', 'Total months', 'Всего месяцев')} value={number(Math.abs(result.months))} />
      <Stat label={t('Toplam hafta', 'Total weeks', 'Всего недель')} value={number(Math.abs(result.weeks))} detail={`${number(Math.abs(result.days))} ${t('gün', 'days', 'дн.')}`} />
      <Stat label={t('İş günü (Pzt–Cum)', 'Weekdays (Mon–Fri)', 'Рабочие дни (пн–пт)')} value={number(weekdays)} detail={t('Resmî tatiller düşülmez', 'Public holidays are not excluded', 'Праздники не исключаются')} />
      <Stat label={t('Toplam saat', 'Total hours', 'Всего часов')} value={number(Math.abs(result.days) * 24)} />
      {nextBirthday !== null ? <Stat label={t('Bir sonraki doğum günü', 'Next birthday', 'Следующий день рождения')} value={nextBirthday === 0 ? t('Bugün! 🎉', 'Today! 🎉', 'Сегодня! 🎉') : `${number(nextBirthday)} ${t('gün sonra', 'days away', 'дн. осталось')}`} tone="positive" /> : <Stat label={t('Toplam dakika', 'Total minutes', 'Всего минут')} value={number(Math.abs(result.days) * 24 * 60)} />}
    </div>}
  </Panel>
}

const unitCatalog: Record<UnitKind, { label: Record<Language, string>; units: Array<{ value: string; symbol: string; tr: string; en: string; ru: string }> }> = {
  length: { label: { tr: 'Uzunluk', en: 'Length', ru: 'Длина' }, units: [{ value: 'mm', symbol: 'mm', tr: 'Milimetre', en: 'Millimetre', ru: 'Миллиметр' }, { value: 'cm', symbol: 'cm', tr: 'Santimetre', en: 'Centimetre', ru: 'Сантиметр' }, { value: 'm', symbol: 'm', tr: 'Metre', en: 'Metre', ru: 'Метр' }, { value: 'km', symbol: 'km', tr: 'Kilometre', en: 'Kilometre', ru: 'Километр' }, { value: 'in', symbol: 'in', tr: 'İnç', en: 'Inch', ru: 'Дюйм' }, { value: 'ft', symbol: 'ft', tr: 'Fit', en: 'Foot', ru: 'Фут' }, { value: 'yd', symbol: 'yd', tr: 'Yarda', en: 'Yard', ru: 'Ярд' }, { value: 'mi', symbol: 'mi', tr: 'Mil', en: 'Mile', ru: 'Миля' }] },
  mass: { label: { tr: 'Ağırlık', en: 'Mass', ru: 'Масса' }, units: [{ value: 'mg', symbol: 'mg', tr: 'Miligram', en: 'Milligram', ru: 'Миллиграмм' }, { value: 'g', symbol: 'g', tr: 'Gram', en: 'Gram', ru: 'Грамм' }, { value: 'kg', symbol: 'kg', tr: 'Kilogram', en: 'Kilogram', ru: 'Килограмм' }, { value: 'oz', symbol: 'oz', tr: 'Ons', en: 'Ounce', ru: 'Унция' }, { value: 'lb', symbol: 'lb', tr: 'Pound', en: 'Pound', ru: 'Фунт' }] },
  area: { label: { tr: 'Alan', en: 'Area', ru: 'Площадь' }, units: [{ value: 'sqm', symbol: 'm²', tr: 'Metrekare', en: 'Square metre', ru: 'Квадратный метр' }, { value: 'sqft', symbol: 'ft²', tr: 'Fitkare', en: 'Square foot', ru: 'Квадратный фут' }, { value: 'acre', symbol: 'ac', tr: 'Akre', en: 'Acre', ru: 'Акр' }, { value: 'hectare', symbol: 'ha', tr: 'Hektar', en: 'Hectare', ru: 'Гектар' }] },
  volume: { label: { tr: 'Hacim', en: 'Volume', ru: 'Объём' }, units: [{ value: 'ml', symbol: 'ml', tr: 'Mililitre', en: 'Millilitre', ru: 'Миллилитр' }, { value: 'l', symbol: 'L', tr: 'Litre', en: 'Litre', ru: 'Литр' }, { value: 'm3', symbol: 'm³', tr: 'Metreküp', en: 'Cubic metre', ru: 'Кубический метр' }, { value: 'cup', symbol: 'cup', tr: 'Su bardağı (ABD)', en: 'Cup (US)', ru: 'Чашка (США)' }, { value: 'gal', symbol: 'gal', tr: 'Galon (ABD)', en: 'Gallon (US)', ru: 'Галлон (США)' }] },
  speed: { label: { tr: 'Hız', en: 'Speed', ru: 'Скорость' }, units: [{ value: 'kmh', symbol: 'km/h', tr: 'Kilometre/saat', en: 'Kilometres per hour', ru: 'Километров в час' }, { value: 'mph', symbol: 'mph', tr: 'Mil/saat', en: 'Miles per hour', ru: 'Миль в час' }, { value: 'ms', symbol: 'm/s', tr: 'Metre/saniye', en: 'Metres per second', ru: 'Метров в секунду' }, { value: 'knot', symbol: 'kn', tr: 'Knot', en: 'Knot', ru: 'Узел' }] },
  temperature: { label: { tr: 'Sıcaklık', en: 'Temperature', ru: 'Температура' }, units: [{ value: 'C', symbol: '°C', tr: 'Celsius', en: 'Celsius', ru: 'Цельсий' }, { value: 'F', symbol: '°F', tr: 'Fahrenheit', en: 'Fahrenheit', ru: 'Фаренгейт' }, { value: 'K', symbol: 'K', tr: 'Kelvin', en: 'Kelvin', ru: 'Кельвин' }] },
  data: { label: { tr: 'Veri', en: 'Data', ru: 'Данные' }, units: [{ value: 'byte', symbol: 'B', tr: 'Bayt', en: 'Byte', ru: 'Байт' }, { value: 'kb', symbol: 'KB', tr: 'Kilobayt', en: 'Kilobyte', ru: 'Килобайт' }, { value: 'mb', symbol: 'MB', tr: 'Megabayt', en: 'Megabyte', ru: 'Мегабайт' }, { value: 'gb', symbol: 'GB', tr: 'Gigabayt', en: 'Gigabyte', ru: 'Гигабайт' }, { value: 'tb', symbol: 'TB', tr: 'Terabayt', en: 'Terabyte', ru: 'Терабайт' }] },
}

export function UnitTool() {
  const { language, t } = useTranslation()
  const [value, setValue] = useState('1')
  const [kind, setKind] = useState<UnitKind>('length')
  const [from, setFrom] = useState('km')
  const [to, setTo] = useState('mi')
  const units = unitCatalog[kind].units
  const safeFrom = units.some((unit) => unit.value === from) ? from : units[0].value
  const safeTo = units.some((unit) => unit.value === to) ? to : units[1].value
  const changeKind = (next: string) => { const nextKind = next as UnitKind; setKind(nextKind); setFrom(unitCatalog[nextKind].units[0].value); setTo(unitCatalog[nextKind].units[1].value) }
  const result = convertUnit(Number(value) || 0, kind, safeFrom, safeTo)
  const unitRate = convertUnit(1, kind, safeFrom, safeTo)
  const symbol = (unit: string) => units.find((item) => item.value === unit)?.symbol ?? unit
  const unitOptions = units.map((unit) => ({ value: unit.value, label: `${unit[language]} (${unit.symbol})` }))
  const number = (amount: number) => formatNumber(amount, language, { maximumFractionDigits: 6 })
  return <Panel>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_1fr]">
      <Field name="value" label={t('Değer', 'Value', 'Значение')} value={value} onChange={setValue} />
      <Select name="kind" label={t('Ölçü türü', 'Measure', 'Величина')} value={kind} onChange={changeKind} options={(Object.keys(unitCatalog) as UnitKind[]).map((key) => ({ value: key, label: unitCatalog[key].label[language] }))} />
      <Select name="from" label={t('Kaynak birim', 'From', 'Из')} value={safeFrom} onChange={setFrom} options={unitOptions} />
      <button type="button" onClick={() => { setFrom(safeTo); setTo(safeFrom) }} aria-label={t('Birimleri değiştir', 'Swap units', 'Поменять единицы')} className="focus-ring mt-6 grid size-11 place-items-center self-start rounded-xl border border-[#dfe6f0] bg-white text-[#5b6f9a] transition hover:border-[#bdcbee] hover:text-[#365fbf]"><ArrowRightLeft className="size-4" /></button>
      <Select name="to" label={t('Hedef birim', 'To', 'В')} value={safeTo} onChange={setTo} options={unitOptions} />
    </div>
    <div className="mt-6 rounded-2xl bg-[#f5f8ff] p-6 text-center">
      <p className="text-[.75rem] text-[#7c89a2]">{number(Number(value) || 0)} {symbol(safeFrom)} =</p>
      <p className="mt-1 break-words font-display text-[clamp(1.5rem,4vw,2.2rem)] font-extrabold text-[#315bc4]">{Number.isFinite(result) ? number(result) : '—'} {symbol(safeTo)}</p>
      <p className="mt-2 text-[.72rem] text-[#8a95a9]">1 {symbol(safeFrom)} = {number(unitRate)} {symbol(safeTo)}</p>
    </div>
  </Panel>
}

export function BmiTool() {
  const { language, t } = useTranslation()
  const [height, setHeight] = useState('175')
  const [weight, setWeight] = useState('72')
  const value = bmi(Number(height), Number(weight))
  const category = bmiCategory(value)
  const range = healthyWeightRange(Number(height))
  const categoryLabels = { underweight: t('Düşük kilolu', 'Underweight', 'Недостаточный вес'), normal: t('Normal', 'Normal', 'Норма'), overweight: t('Fazla kilolu', 'Overweight', 'Избыточный вес'), obese: t('Obez', 'Obese', 'Ожирение') }
  const marker = Math.min(100, Math.max(0, ((value - 12) / (40 - 12)) * 100))
  const number = (amount: number, digits = 1) => formatNumber(amount, language, { maximumFractionDigits: digits })
  return <Panel>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="height" label={t('Boy', 'Height', 'Рост')} value={height} onChange={setHeight} suffix="cm" min="50" max="272" />
      <Field name="weight" label={t('Kilo', 'Weight', 'Вес')} value={weight} onChange={setWeight} suffix="kg" min="2" max="500" />
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Result label={t('Vücut kitle indeksin', 'Your body mass index', 'Ваш индекс массы тела')} value={value > 0 ? number(value) : '—'} detail={value > 0 ? categoryLabels[category] : undefined} tone={category === 'normal' ? 'positive' : category === 'obese' ? 'negative' : 'default'} />
      <Stat label={t('Bu boy için normal aralık', 'Normal range for this height', 'Норма для этого роста')} value={range.max > 0 ? `${number(range.min, 0)}–${number(range.max, 0)} kg` : '—'} detail={`BMI ${number(18.5)}–${number(24.9)}`} />
    </div>
    <div className="mt-5" role="img" aria-label={`BMI ${number(value)} · ${categoryLabels[category]}`}>
      <div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-r from-[#8fc4ea] via-[#7fd3ad] via-45% to-[#e8a4ae]" />
      {value > 0 && <div className="relative -mt-4 h-5" style={{ marginLeft: `${marker}%` }}><span className="absolute -translate-x-1/2 text-[#2f4470]">▲</span></div>}
      <div className="mt-1 grid grid-cols-4 text-[.66rem] text-[#8a95a9]"><span>{'<'}{number(BMI_THRESHOLDS.underweight)} · {categoryLabels.underweight}</span><span className="text-center">{number(BMI_THRESHOLDS.underweight)}–{number(24.9)} · {categoryLabels.normal}</span><span className="text-center">25–{number(29.9)} · {categoryLabels.overweight}</span><span className="text-right">30+ · {categoryLabels.obese}</span></div>
    </div>
    <Note>{t('BMI kas kütlesini, yaşı ve vücut kompozisyonunu ayırt etmez; sporcularda ve yaşlılarda yanıltıcı olabilir. Sağlık kararları için bir uzmana danışın.', 'BMI does not distinguish muscle mass, age or body composition and can mislead for athletes and older adults. Consult a professional for health decisions.', 'ИМТ не учитывает мышечную массу, возраст и состав тела и может вводить в заблуждение у спортсменов и пожилых. Для решений о здоровье обратитесь к специалисту.')}</Note>
  </Panel>
}

export function CalorieTool() {
  const { language, t } = useTranslation()
  const [weight, setWeight] = useState('72')
  const [height, setHeight] = useState('175')
  const [age, setAge] = useState('30')
  const [gender, setGender] = useState('male')
  const [activity, setActivity] = useState('1.375')
  const [goal, setGoal] = useState<'maintain' | 'lose' | 'gain'>('maintain')
  const calc = tdee(Number(weight) || 0, Number(height) || 0, Number(age) || 0, gender as 'male' | 'female', Number(activity))
  const adjustment = goal === 'lose' ? -500 : goal === 'gain' ? 300 : 0
  const target = Math.max(0, calc.tdee + adjustment)
  const kcal = (value: number) => `${formatNumber(Math.round(value), language, { maximumFractionDigits: 0 })} kcal`
  return <Panel>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field name="weight" label={t('Kilo', 'Weight', 'Вес')} value={weight} onChange={setWeight} suffix="kg" min="20" max="400" />
      <Field name="height" label={t('Boy', 'Height', 'Рост')} value={height} onChange={setHeight} suffix="cm" min="100" max="250" />
      <Field name="age" label={t('Yaş', 'Age', 'Возраст')} value={age} onChange={setAge} suffix={t('yıl', 'years', 'лет')} min="10" max="120" step="1" />
      <Select name="gender" label={t('Cinsiyet', 'Sex', 'Пол')} value={gender} onChange={setGender} options={[{ value: 'male', label: t('Erkek', 'Male', 'Мужской') }, { value: 'female', label: t('Kadın', 'Female', 'Женский') }]} />
      <Select name="activity" label={t('Aktivite düzeyi', 'Activity level', 'Уровень активности')} value={activity} onChange={setActivity} options={[{ value: '1.2', label: t('Hareketsiz · masa başı', 'Sedentary · desk job', 'Сидячий · офисная работа') }, { value: '1.375', label: t('Hafif aktif · haftada 1–3 gün', 'Lightly active · 1–3 days/week', 'Лёгкая активность · 1–3 дня в неделю') }, { value: '1.55', label: t('Orta aktif · haftada 3–5 gün', 'Moderately active · 3–5 days/week', 'Умеренная · 3–5 дней в неделю') }, { value: '1.725', label: t('Çok aktif · haftada 6–7 gün', 'Very active · 6–7 days/week', 'Высокая · 6–7 дней в неделю') }, { value: '1.9', label: t('Aşırı aktif · fiziksel iş + antrenman', 'Extra active · physical job + training', 'Очень высокая · физический труд + тренировки') }]} />
      <div className="self-end"><Segmented name="goal" label={t('Hedef', 'Goal', 'Цель')} value={goal} onChange={setGoal} options={[{ value: 'lose', label: t('Kilo ver', 'Lose', 'Похудеть') }, { value: 'maintain', label: t('Koru', 'Maintain', 'Поддерживать') }, { value: 'gain', label: t('Kilo al', 'Gain', 'Набрать') }]} /></div>
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <Result label={t('Günlük hedef kalori', 'Daily calorie target', 'Дневная норма калорий')} value={kcal(target)} detail={goal === 'maintain' ? t('Mevcut kiloyu korumak için', 'To maintain current weight', 'Для поддержания текущего веса') : goal === 'lose' ? t('Günde −500 kcal ≈ haftada 0,5 kg', '−500 kcal/day ≈ 0.5 kg per week', '−500 ккал/день ≈ 0,5 кг в неделю') : t('Günde +300 kcal · kontrollü kilo alımı', '+300 kcal/day · controlled gain', '+300 ккал/день · плавный набор')} />
      <Stat label={t('Toplam günlük harcama (TDEE)', 'Total daily expenditure (TDEE)', 'Суточный расход энергии (TDEE)')} value={kcal(calc.tdee)} />
      <Stat label={t('Bazal metabolizma (BMR)', 'Basal metabolic rate (BMR)', 'Базовый обмен (BMR)')} value={kcal(calc.bmr)} detail={t('Mifflin-St Jeor formülü', 'Mifflin-St Jeor equation', 'Формула Миффлина — Сан Жеора')} />
    </div>
    <Note>{t('Tahmini değerlerdir; gerçek ihtiyaç kas kütlesi, uyku ve sağlık durumuna göre değişir. 1.200 kcal altına uzman gözetimi olmadan inmeyin.', 'These are estimates; real needs vary with muscle mass, sleep and health. Do not go below 1,200 kcal without professional supervision.', 'Это оценки; реальная потребность зависит от мышечной массы, сна и здоровья. Не опускайтесь ниже 1 200 ккал без наблюдения специалиста.')}</Note>
  </Panel>
}
