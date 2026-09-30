'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { useToolHistoryField } from '@/components/tool-history'
import { useTranslation } from '@/hooks/use-language'
import { formatDate, formatNumber, localeFor, monthName, todayIso, type Language } from '@/lib/format'
import { addDays, buildCalendar, DEFAULT_REGION, DEFAULT_WEEKEND, HOLIDAY_COUNTRIES, HOLIDAY_COUNTRY_NAMES, HOLIDAY_REGION_NAMES, HOLIDAY_REGIONS, HOLIDAY_YEARS, HOLIDAYS_GENERATED_AT, holidayLabel, holidaysBetween, holidaysOnWeekends, isHolidayCountry, isoWeekday, MAX_LEAVE_DAYS, periodRange, planLeave, WEEKDAYS, type CalendarDay, type HolidayCountry, type IsoWeekday, type LeavePlan, type Period, type Strategy, type Stretch } from '@/lib/leave-planner'
import { DataTable, Field, FormSection, Note, Panel, Result, Segmented, Select, Stat } from './shared'

const subscribeNoop = () => () => {}
const weekdayNames = (language: Language, style: 'short' | 'long') => WEEKDAYS.map((weekday) => new Intl.DateTimeFormat(localeFor(language), { weekday: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, weekday))))
const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1)

export function LeavePlannerTool() {
  const { language, t } = useTranslation()
  // Rendered on the client only once the real date is known, so static HTML never bakes in a build-time "today".
  const today = useSyncExternalStore(subscribeNoop, () => todayIso(), () => null)
  const [country, setCountry] = useState<HolidayCountry>('TR')
  const [region, setRegion] = useState('')
  const [period, setPeriod] = useState('next12')
  const [days, setDays] = useState('10')
  const [weekend, setWeekend] = useState<IsoWeekday[]>([...DEFAULT_WEEKEND])
  const [strategy, setStrategy] = useState<Strategy>('total')

  const regions = HOLIDAY_REGIONS[country] ?? []
  const effectiveRegion = regions.includes(region) ? region : DEFAULT_REGION[country] ?? ''
  const currentYear = Number((today ?? todayIso()).slice(0, 4))
  const periodOptions = [{ value: 'next12', label: t('Önümüzdeki 12 ay', 'Next 12 months', 'Ближайшие 12 месяцев') }, ...HOLIDAY_YEARS.filter((year) => year >= currentYear).map((year) => ({ value: String(year), label: year === currentYear ? t(`${year} (kalan aylar)`, `${year} (rest of the year)`, `${year} (до конца года)`) : String(year) }))]
  const periodValue: Period = period === 'next12' ? 'next12' : Number(period)
  const budget = Math.min(MAX_LEAVE_DAYS, Math.max(0, Math.floor(Number(days) || 0)))

  const range = useMemo(() => (today ? periodRange(periodValue, today) : null), [periodValue, today])
  const holidays = useMemo(() => (range ? holidaysBetween(country, range.from, range.to, effectiveRegion || null) : []), [country, range, effectiveRegion])
  const calendar = useMemo(() => (range ? buildCalendar(range.from, range.to, weekend, holidays) : []), [range, weekend, holidays])
  const plan = useMemo(() => (calendar.length ? planLeave(calendar, budget, strategy) : null), [calendar, budget, strategy])

  const shortNames = weekdayNames(language, 'short')
  const countryOptions = HOLIDAY_COUNTRIES.map((code) => ({ value: code, label: HOLIDAY_COUNTRY_NAMES[code][language] }))
  const regionOptions = regions.map((code) => ({ value: code, label: HOLIDAY_REGION_NAMES[code]?.[language] ?? code }))
  const periodLabel = period === 'next12' ? t('önümüzdeki 12 ayda', 'in the next 12 months', 'в ближайшие 12 месяцев') : t(`${period} yılında`, `in ${period}`, `в ${period} году`)

  return <Panel>
    <FormSection title={t('Ülke ve dönem', 'Country and period', 'Страна и период')}>
      <Select name="country" label={t('Ülke', 'Country', 'Страна')} value={country} onChange={(value) => { if (isHolidayCountry(value)) { setCountry(value); setRegion('') } }} options={countryOptions} />
      {regions.length > 0 && <Select name="region" label={t('Bölge', 'Region', 'Регион')} value={effectiveRegion} onChange={setRegion} options={regionOptions} />}
      <Select name="period" label={t('Dönem', 'Period', 'Период')} value={period} onChange={setPeriod} options={periodOptions} />
    </FormSection>
    <FormSection title={t('İzin ve çalışma düzeni', 'Leave and working pattern', 'Отпуск и график работы')}>
      <Field name="days" label={t('İzin günü sayısı', 'Leave days available', 'Дней отпуска')} value={days} onChange={setDays} min="0" max={String(MAX_LEAVE_DAYS)} step="1" suffix={t('gün', 'days', 'дн.')} />
      <WeekdayPicker label={t('Haftalık tatil günleri', 'Weekly days off', 'Выходные дни недели')} names={shortNames} value={weekend} onChange={setWeekend} hint={t('Çalıştığın günleri kapalı bırak; cumartesi çalışıyorsan yalnızca pazarı seç.', 'Leave your working days unselected; if you work Saturdays, select only Sunday.', 'Оставьте рабочие дни невыбранными; если работаете по субботам, выберите только воскресенье.')} />
      <Segmented name="strategy" label={t('Strateji', 'Strategy', 'Стратегия')} value={strategy} onChange={setStrategy} options={[{ value: 'total', label: t('En fazla tatil günü', 'Most days off', 'Больше выходных') }, { value: 'longest', label: t('En uzun tek tatil', 'One longest break', 'Один длинный отпуск') }]} className="sm:col-span-2" />
    </FormSection>
    <p className="mt-3 text-[.7rem] leading-relaxed text-[#8b97ab]">{strategy === 'total'
      ? t('Her izin günü, yanındaki hafta sonu ve resmi tatilleri “yakalar”; plan, izinlerin yakaladığı serbest gün sayısını en yüksek yapar. Aynı değerdeki uzun hafta sonları döneme yayılır, hiçbir şey kazandırmayan günler serbest bırakılır.', 'Each leave day “captures” the weekend and holiday days next to it; the plan maximises the free days captured. Equally valuable long weekends are spread over the period, and days that would gain nothing are left free.', 'Каждый день отпуска «захватывает» соседние выходные и праздники; план максимизирует число захваченных свободных дней. Равноценные длинные уик-энды распределяются по периоду, а бесполезные дни остаются свободными.')
      : t('Önce izinlerin en uzun aralıksız tatili oluşturduğu pencere bulunur; artan izin günleri başka köprülere dağıtılır.', 'First the window where your leave makes the longest continuous break is found; any remaining days go to other bridges.', 'Сначала находится окно, где отпуск даёт самый длинный непрерывный отдых; оставшиеся дни идут на другие «мостики».')}</p>

    {!today || !range || !plan ? <Note tone={today ? 'warning' : 'info'}>{today ? t('Seçilen dönem için tatil verisi yok.', 'No holiday data for the chosen period.', 'Нет данных о праздниках для выбранного периода.') : t('Takvim hazırlanıyor…', 'Preparing the calendar…', 'Готовим календарь…')}</Note>
      : <PlanResults plan={plan} calendar={calendar} country={country} periodLabel={periodLabel} clipped={range.clipped} weekend={weekend} language={language} t={t} />}

    <Note>{t('Kaynak', 'Source', 'Источник')}: <a className="underline" href="https://date.nager.at" target="_blank" rel="noreferrer">Nager.Date</a> ({t('MIT lisansı', 'MIT licence', 'лицензия MIT')}) · {t('Paket güncelleme', 'Bundle updated', 'Данные обновлены')}: {HOLIDAYS_GENERATED_AT}. {t('Ulusal resmi tatiller esas alınır; bölgesel tatiller yalnızca Birleşik Krallık ve Almanya için seçilebilir. Arife gibi yarım günler, idari izinler ve işyerine özel tatiller dahil değildir. Gelecek yıllardaki dinî bayram tarihleri kesinleşene kadar tahminidir (≈ ile işaretli). Planı işvereninle teyit et.', 'Nationwide public holidays are used; regional holidays can be chosen for the United Kingdom and Germany only. Half days such as holiday eves, administrative leave and company-specific days off are not included. Religious holiday dates in future years are provisional until confirmed (marked ≈). Confirm the plan with your employer.', 'Учитываются общенациональные праздники; региональные можно выбрать только для Великобритании и Германии. Полудни, административные отпуска и корпоративные выходные не учитываются. Даты религиозных праздников будущих лет предварительные (отмечены ≈). Согласуйте план с работодателем.')}</Note>
  </Panel>
}

function WeekdayPicker({ label, names, value, onChange, hint }: { label: string; names: string[]; value: IsoWeekday[]; onChange: (value: IsoWeekday[]) => void; hint: string }) {
  useToolHistoryField({ name: 'weekend', label, value: value.join(','), onRestore: (next) => onChange(String(next).split(',').map(Number).filter((day): day is IsoWeekday => WEEKDAYS.includes(day as IsoWeekday))), format: (next) => `${label}: ${String(next).split(',').map((day) => names[Number(day) - 1] ?? day).join(', ')}` })
  const toggle = (weekday: IsoWeekday) => onChange(value.includes(weekday) ? value.filter((day) => day !== weekday) : [...value, weekday].sort((a, b) => a - b))
  return <div className="space-y-1 sm:col-span-2">
    <span className="block text-[.76rem] font-semibold leading-[1.15rem] text-[#52607b]">{label}</span>
    <div role="group" aria-label={label} className="weekday-picker">{WEEKDAYS.map((weekday) => <button key={weekday} type="button" aria-pressed={value.includes(weekday)} onClick={() => toggle(weekday)} className="year-chip focus-ring">{capitalize(names[weekday - 1])}</button>)}</div>
    <span className="block text-[.68rem] text-[#8b97ab]">{hint}</span>
  </div>
}

type ResultProps = { plan: LeavePlan; calendar: CalendarDay[]; country: HolidayCountry; periodLabel: string; clipped: boolean; weekend: IsoWeekday[]; language: Language; t: (a: string, b: string, c?: string) => string }

function PlanResults({ plan, calendar, country, periodLabel, clipped, weekend, language, t }: ResultProps) {
  const number = (value: number, digits = 0) => formatNumber(value, language, { maximumFractionDigits: digits })
  const dayWord = (count: number) => `${number(count)} ${t('gün', count === 1 ? 'day' : 'days', 'дн.')}`
  const range = (start: string, end: string) => {
    const sameMonth = start.slice(0, 7) === end.slice(0, 7), sameYear = start.slice(0, 4) === end.slice(0, 4)
    if (sameMonth) return `${Number(start.slice(8, 10))}–${formatDate(end, language)}`
    if (sameYear) return `${formatDate(start, language, { day: 'numeric', month: 'long' })} – ${formatDate(end, language)}`
    return `${formatDate(start, language)} – ${formatDate(end, language)}`
  }
  const shortDate = (iso: string) => formatDate(iso, language, { day: 'numeric', month: 'short' })
  const leaveSet = new Set(plan.leaveDays)
  const stretchDays = new Set(plan.stretches.flatMap((stretch) => { const days: string[] = []; for (let iso = stretch.start; iso <= stretch.end; iso = addDays(iso, 1)) days.push(iso); return days }))
  const holidayRows = calendar.filter((day) => day.holidays.length > 0)
  const wasted = holidaysOnWeekends(calendar).length
  const usedRatio = plan.ratio === null ? '—' : `×${number(plan.ratio, 1)}`
  const longest = plan.longest
  return <div className="mt-6 space-y-4">
    <Result label={t(`${capitalize(periodLabel)} ${number(plan.leaveUsed)} izin günüyle`, `With ${number(plan.leaveUsed)} leave days ${periodLabel}`, `${capitalize(periodLabel)} с ${number(plan.leaveUsed)} дн. отпуска`)} value={t(`${number(plan.totalOffDays)} gün tatil`, `${number(plan.totalOffDays)} days off`, `${number(plan.totalOffDays)} дн. отдыха`)} detail={[`${t('izin başına', 'per leave day', 'на день отпуска')} ${usedRatio}`, `${number(plan.stretches.length)} ${t('tatil bloğu', plan.stretches.length === 1 ? 'break' : 'breaks', 'блок(ов)')}`, longest ? t(`en uzunu ${dayWord(longest.length)}`, `longest ${dayWord(longest.length)}`, `самый длинный ${dayWord(longest.length)}`) : '', plan.leaveLeft > 0 ? t(`${number(plan.leaveLeft)} izin günü serbest kalıyor`, `${number(plan.leaveLeft)} leave days stay free to use`, `${number(plan.leaveLeft)} дн. отпуска остаются свободными`) : ''].filter(Boolean).join(' · ')} tone={plan.totalOffDays > 0 ? 'positive' : 'default'} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label={t('Kullanılan izin', 'Leave used', 'Использовано отпуска')} value={`${number(plan.leaveUsed)} / ${number(plan.budget)}`} detail={plan.leaveLeft > 0 ? t('kalanı istediğin gibi kullan', 'use the rest as you like', 'остальное по желанию') : t('tamamı planlandı', 'all planned', 'всё распределено')} />
      <Stat label={t('Yakalanan serbest gün', 'Free days captured', 'Захвачено свободных дней')} value={number(plan.attachedFreeDays)} tone="positive" detail={t('hafta sonu + resmi tatil', 'weekends + holidays', 'выходные + праздники')} />
      <Stat label={t('En uzun tatil', 'Longest break', 'Самый длинный отдых')} value={longest ? dayWord(longest.length) : '—'} detail={longest ? range(longest.start, longest.end) : undefined} />
      <Stat label={t('Dönemdeki resmi tatil', 'Public holidays in period', 'Праздников в периоде')} value={number(holidayRows.length)} detail={wasted > 0 ? t(`${number(wasted)} tanesi hafta sonuna denk geliyor`, `${number(wasted)} fall on your days off`, `${number(wasted)} выпадают на выходные`) : t('hiçbiri hafta sonuna denk gelmiyor', 'none fall on your days off', 'ни один не выпадает на выходные')} />
    </div>
    {clipped && <Note tone="warning">{t(`Tatil verisi ${HOLIDAY_YEARS[HOLIDAY_YEARS.length - 1]} sonuna kadar; dönem buna göre kısaltıldı.`, `Holiday data ends in ${HOLIDAY_YEARS[HOLIDAY_YEARS.length - 1]}; the period was shortened accordingly.`, `Данные о праздниках заканчиваются в ${HOLIDAY_YEARS[HOLIDAY_YEARS.length - 1]}; период сокращён.`)}</Note>}

    <div>
      <h3 className="font-display text-[1rem] font-extrabold text-[#1c2846]">{t('İzin alınacak günler', 'Days to take off', 'Дни для отпуска')}</h3>
      {plan.stretches.length === 0
        ? <p className="mt-2 text-[.78rem] text-[#6d7b95]">{plan.budget === 0 ? t('İzin günü sayısını gir.', 'Enter how many leave days you have.', 'Укажите число дней отпуска.') : t('Bu dönemde izinle uzatılabilecek bir tatil yok.', 'No break in this period can be extended with leave.', 'В этом периоде нет отдыха, который можно продлить отпуском.')}</p>
        : <ol className="stretch-list mt-3">{plan.stretches.map((stretch) => <StretchCard key={stretch.start} stretch={stretch} country={country} language={language} t={t} range={range} shortDate={shortDate} dayWord={dayWord} />)}</ol>}
    </div>

    <div>
      <h3 className="font-display text-[1rem] font-extrabold text-[#1c2846]">{t('Takvim', 'Calendar', 'Календарь')}</h3>
      <div className="leave-legend mt-2"><span><i style={{ background: '#4d76df' }} />{t('İzin', 'Leave', 'Отпуск')}</span><span><i style={{ background: '#ffe9c2' }} />{t('Resmi tatil', 'Public holiday', 'Праздник')}</span><span><i style={{ background: '#eef1f6' }} />{t('Haftalık tatil', 'Weekly day off', 'Выходной')}</span><span><i style={{ background: '#fff', boxShadow: 'inset 0 0 0 2px #c9d6ff' }} />{t('Tatil bloğu', 'Break', 'Блок отдыха')}</span></div>
      <LeaveCalendar calendar={calendar} leave={leaveSet} stretchDays={stretchDays} weekend={weekend} country={country} language={language} />
    </div>

    <div>
      <h3 className="font-display text-[1rem] font-extrabold text-[#1c2846]">{t('Dönemdeki resmi tatiller', 'Public holidays in the period', 'Праздники в периоде')}</h3>
      <DataTable headers={[t('Tarih', 'Date', 'Дата'), t('Gün', 'Day', 'День'), t('Tatil', 'Holiday', 'Праздник'), t('Not', 'Note', 'Примечание')]} rows={holidayRows.map((day) => [formatDate(day.iso, language), capitalize(weekdayNames(language, 'long')[day.weekday - 1]), day.holidays.map((entry) => `${entry.tentative ? '≈ ' : ''}${holidayLabel(entry, country, language)}`).join(' · '), day.weekend ? t('hafta sonuna denk geliyor', 'falls on a day off', 'выпадает на выходной') : stretchDays.has(day.iso) ? t('planda kullanıldı', 'used in the plan', 'использован в плане') : t('tek başına', 'stands alone', 'отдельно')])} maxHeight="max-h-96" minWidth="min-w-[560px]" />
    </div>
  </div>
}

function StretchCard({ stretch, country, language, t, range, shortDate, dayWord }: { stretch: Stretch; country: HolidayCountry; language: Language; t: ResultProps['t']; range: (start: string, end: string) => string; shortDate: (iso: string) => string; dayWord: (count: number) => string }) {
  const holidayNames = [...new Set(stretch.holidays.map((entry) => holidayLabel(entry, country, language).replace(/\s+\d+\.\s*Gün$/i, '').replace(/\s+(First|Second|Third|Fourth) Day$/i, '')))]
  return <li className="stretch-card">
    <span className="stretch-length">{dayWord(stretch.length)}</span>
    <b>{range(stretch.start, stretch.end)}</b>
    <span className="chip leave">{t(`${stretch.leaveDays.length} izin: ${stretch.leaveDays.map(shortDate).join(', ')}`, `${stretch.leaveDays.length} leave: ${stretch.leaveDays.map(shortDate).join(', ')}`, `${stretch.leaveDays.length} дн. отпуска: ${stretch.leaveDays.map(shortDate).join(', ')}`)}</span>
    {holidayNames.length > 0 && <span className="chip holiday">{holidayNames.join(' · ')}</span>}
    {stretch.weekendDays > 0 && <span className="chip">{t(`${stretch.weekendDays} hafta sonu günü`, `${stretch.weekendDays} weekend days`, `${stretch.weekendDays} вых.`)}</span>}
  </li>
}

function LeaveCalendar({ calendar, leave, stretchDays, weekend, country, language }: { calendar: CalendarDay[]; leave: Set<string>; stretchDays: Set<string>; weekend: IsoWeekday[]; country: HolidayCountry; language: Language }) {
  const byIso = new Map(calendar.map((day) => [day.iso, day]))
  const first = calendar[0].iso, last = calendar[calendar.length - 1].iso
  const months: string[] = []
  for (let cursor = `${first.slice(0, 7)}-01`; cursor <= last; cursor = addDays(cursor, 32).slice(0, 7) + '-01') months.push(cursor.slice(0, 7))
  const names = weekdayNames(language, 'short')
  return <div className="leave-months mt-3">{months.map((month) => {
    const [year, monthNumber] = month.split('-').map(Number)
    const start = `${month}-01`
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
    const blanks = isoWeekday(start) - 1
    return <section key={month} className="leave-month" aria-label={`${monthName(monthNumber - 1, language, 'long')} ${year}`}>
      <h4>{capitalize(monthName(monthNumber - 1, language, 'long'))} {year}</h4>
      <div className="leave-grid">
        {names.map((name) => <span key={name} className="wd">{capitalize(name.slice(0, 2))}</span>)}
        {Array.from({ length: blanks }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const iso = `${month}-${String(index + 1).padStart(2, '0')}`
          const day = byIso.get(iso)
          const outside = !day
          const isWeekend = day ? day.weekend : weekend.includes(isoWeekday(iso))
          const classes = ['leave-day', outside ? 'is-outside' : '', isWeekend ? 'is-weekend' : '', day && day.holidays.length ? 'is-holiday' : '', stretchDays.has(iso) ? 'is-stretch' : '', leave.has(iso) ? 'is-leave' : ''].filter(Boolean).join(' ')
          const title = day && day.holidays.length ? day.holidays.map((entry) => holidayLabel(entry, country, language)).join(', ') : leave.has(iso) ? (language === 'tr' ? 'İzin' : language === 'ru' ? 'Отпуск' : 'Leave') : undefined
          return <span key={iso} className={classes} title={title}>{index + 1}</span>
        })}
      </div>
    </section>
  })}</div>
}

