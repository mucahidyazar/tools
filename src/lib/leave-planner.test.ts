import assert from 'node:assert/strict'
import test from 'node:test'
import { addDays, buildCalendar, holidaysBetween, holidaysOnWeekends, isoWeekday, periodRange, planLeave, type HolidayEntry } from './leave-planner'

const holiday = (date: string, name = 'Holiday'): HolidayEntry => ({ date, local: name, name })
// January 2027 starts on a Friday; 4 January is a Monday.
const january = (holidays: HolidayEntry[] = [], weekend: (1 | 2 | 3 | 4 | 5 | 6 | 7)[] = [6, 7]) => buildCalendar('2027-01-01', '2027-01-31', weekend, holidays)

test('date helpers work in UTC and know the ISO weekday', () => {
  assert.equal(isoWeekday('2027-01-04'), 1)
  assert.equal(isoWeekday('2027-01-03'), 7)
  assert.equal(addDays('2027-02-28', 1), '2027-03-01')
  assert.equal(addDays('2028-02-28', 1), '2028-02-29')
})

test('the period covers the next twelve months or a calendar year and is clipped to the bundled years', () => {
  assert.deepEqual(periodRange('next12', '2026-09-27'), { from: '2026-09-27', to: '2027-09-26', clipped: false })
  assert.deepEqual(periodRange(2026, '2026-09-27'), { from: '2026-09-27', to: '2026-12-31', clipped: false })
  assert.deepEqual(periodRange(2027, '2026-09-27'), { from: '2027-01-01', to: '2027-12-31', clipped: false })
  assert.equal(periodRange(2029, '2029-06-15')!.clipped, false)
  assert.deepEqual(periodRange('next12', '2029-06-15'), { from: '2029-06-15', to: '2029-12-31', clipped: true })
  assert.equal(periodRange(2031, '2026-09-27'), null)
})

test('one leave day next to a Thursday holiday buys a four-day weekend', () => {
  const calendar = january([holiday('2027-01-14', 'Thursday off')])
  const plan = planLeave(calendar, 1)
  assert.deepEqual(plan.leaveDays, ['2027-01-15'])
  assert.equal(plan.stretches.length, 1)
  assert.deepEqual([plan.stretches[0].start, plan.stretches[0].end, plan.stretches[0].length], ['2027-01-14', '2027-01-17', 4])
  assert.equal(plan.attachedFreeDays, 3)
  assert.equal(plan.ratio, 4)
  assert.equal(plan.leaveLeft, 0)
})

test('the total strategy prefers holiday bridges over plain long weekends and leaves useless days unused', () => {
  const calendar = january([holiday('2027-01-12', 'Tuesday off'), holiday('2027-01-27', 'Wednesday off')])
  const two = planLeave(calendar, 2)
  assert.deepEqual(two.leaveDays, ['2027-01-11', '2027-01-15'], 'the Monday before the Tuesday holiday attaches three days; the spare day becomes a mid-month long weekend')
  assert.equal(two.attachedFreeDays, 5)
  assert.ok(planLeave(calendar, 1).leaveDays[0] === '2027-01-11')
  const none = planLeave(january(), 0)
  assert.equal(none.stretches.length, 0)
  assert.equal(none.totalOffDays, 0)
  assert.equal(none.ratio, null)
  const many = planLeave(january(), 60)
  assert.ok(many.leaveLeft > 0, 'January cannot absorb sixty useful leave days')
  assert.ok(many.leaveDays.every((iso) => !january().find((day) => day.iso === iso)!.off))
})

test('weekly days off follow the user, so someone working Saturdays sees Saturday as a work day', () => {
  const sundayOnly = january([holiday('2027-01-14', 'Thursday off')], [7])
  const plan = planLeave(sundayOnly, 1)
  assert.ok(['2027-01-13', '2027-01-15'].includes(plan.leaveDays[0]), `expected a day next to the holiday, got ${plan.leaveDays}`)
  assert.equal(plan.stretches[0].length, 2, 'the holiday plus one day; Saturday is a work day and breaks the run')
  const fridaySaturday = january([holiday('2027-01-14', 'Thursday off')], [5, 6])
  assert.equal(planLeave(fridaySaturday, 1).longest!.length, 4)
})

test('the longest strategy builds one long break and bridges with what is left', () => {
  const calendar = january([holiday('2027-01-01', 'New Year'), holiday('2027-01-06', 'Epiphany')])
  const plan = planLeave(calendar, 3, 'longest')
  assert.equal(plan.longest!.start, '2027-01-01')
  assert.equal(plan.longest!.end, '2027-01-07')
  assert.equal(plan.longest!.length, 7)
  assert.deepEqual(plan.leaveDays, ['2027-01-04', '2027-01-05', '2027-01-07'])
  assert.equal(plan.leaveUsed, 3)
  const four = planLeave(calendar, 4, 'longest')
  assert.equal(four.longest!.length, 10, 'a fourth day reaches the second weekend')
  const short = planLeave(buildCalendar('2027-01-04', '2027-01-08', [6, 7], []), 10, 'longest')
  assert.equal(short.leaveUsed, 5)
  assert.equal(short.leaveLeft, 5)
})

test('bundled holidays respect regions and skip non-public observances', () => {
  const turkey = holidaysBetween('TR', '2026-01-01', '2026-12-31')
  assert.equal(turkey.length, 14)
  assert.ok(turkey.some((entry) => entry.date === '2026-05-27' && entry.local.startsWith('Kurban Bayramı')))
  assert.ok(holidaysBetween('TR', '2027-01-01', '2027-12-31').some((entry) => entry.tentative))
  const england = holidaysBetween('GB', '2026-01-01', '2026-12-31', 'GB-ENG')
  assert.ok(england.some((entry) => entry.date === '2026-01-01'), 'New Year’s Day is regional in the source but applies to England')
  assert.ok(!england.some((entry) => entry.date === '2026-01-02'), '2 January is Scotland only')
  assert.ok(holidaysBetween('GB', '2026-01-01', '2026-12-31', 'GB-SCT').some((entry) => entry.date === '2026-01-02'))
  assert.ok(!holidaysBetween('GB', '2026-01-01', '2026-12-31').some((entry) => entry.date === '2026-01-01'), 'without a region only nationwide holidays remain')
  assert.ok(!holidaysBetween('NL', '2026-01-01', '2026-12-31').some((entry) => entry.date === '2026-04-03'), 'Good Friday is not a public holiday in the Netherlands')
  assert.ok(holidaysBetween('DE', '2026-01-01', '2026-12-31', 'DE-BY').some((entry) => entry.date === '2026-06-04'), 'Corpus Christi applies in Bavaria')
})

test('a real Turkish plan around Kurban Bayramı 2026 turns two leave days into a nine-day break', () => {
  const holidays = holidaysBetween('TR', '2026-05-01', '2026-06-30')
  const calendar = buildCalendar('2026-05-01', '2026-06-30', [6, 7], holidays)
  const plan = planLeave(calendar, 2, 'longest')
  assert.equal(plan.longest!.length, 9)
  assert.equal(plan.longest!.start, '2026-05-23')
  assert.equal(plan.longest!.end, '2026-05-31')
  assert.deepEqual(plan.leaveDays, ['2026-05-25', '2026-05-26'])
  assert.equal(planLeave(calendar, 3, 'longest').longest!.length, 10)
  const total = planLeave(calendar, 2, 'total')
  assert.deepEqual(total.leaveDays, ['2026-05-18', '2026-05-26'], 'two separate bridges attach eight days: 19 May with its weekend, and Kurban Bayramı with the weekend after')
  assert.equal(total.attachedFreeDays, 8)
  assert.equal(holidaysOnWeekends(calendar).length, 1, '30 May 2026 (fourth day of Kurban Bayramı) is a Saturday')
})

test('interchangeable long weekends are spread across the period instead of clustering', () => {
  const plan = planLeave(january(), 3)
  assert.equal(plan.leaveUsed, 3)
  assert.ok(plan.stretches.every((stretch) => stretch.length === 3), `expected three long weekends, got ${plan.stretches.map((stretch) => stretch.length)}`)
  const gaps = plan.leaveDays.slice(1).map((iso, index) => (new Date(iso).getTime() - new Date(plan.leaveDays[index]).getTime()) / 86_400_000)
  assert.ok(gaps.every((gap) => gap >= 7), `gaps were ${gaps}`)
})

test('equal totals merge into one long break rather than a short one plus a stray long weekend', () => {
  const calendar = january([holiday('2027-01-13', 'Feast 1'), holiday('2027-01-14', 'Feast 2'), holiday('2027-01-15', 'Feast 3')])
  const plan = planLeave(calendar, 2)
  assert.deepEqual(plan.leaveDays, ['2027-01-11', '2027-01-12'], 'Monday and Tuesday before a Wednesday-to-Friday feast give nine days')
  assert.equal(plan.stretches.length, 1)
  assert.equal(plan.longest!.length, 9)
  assert.equal(plan.attachedFreeDays, 7)
  const three = planLeave(calendar, 3)
  assert.equal(three.attachedFreeDays, 9, 'a third day is worth two more free days as a separate long weekend')
  assert.equal(three.stretches.length, 2)
})

test('spread long weekends never share a weekend', () => {
  const calendar = buildCalendar('2027-04-26', '2027-05-09', [6, 7], [holiday('2027-05-01', 'Labour Day')])
  const plan = planLeave(calendar, 2)
  assert.equal(plan.attachedFreeDays, 4, 'two leave days must capture two different weekends')
  assert.equal(plan.stretches.length, 2)
})
