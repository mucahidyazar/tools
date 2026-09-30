'use client'

import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { NumerologyWheel } from '@/components/result-chart'
import { DateField } from '@/components/ui/date-field'
import { useTranslation, type Language } from '@/hooks/use-language'
import { formatDate, monthName, todayIso } from '@/lib/format'
import { maturityNumber, NUMEROLOGY_LABELS, numerologyFromDate, numerologyFromName, numerologyMeaning, personalCycle, reduceNumber, reductionTrail, wheelPosition, type NumerologyNumber } from '@/lib/numerology'
import { Field, Note, Panel, QuietButton } from './shared'

function NumberCard({ number, label, trail, language, emphasis = false }: { number: NumerologyNumber; label: string; trail?: string; language: Language; emphasis?: boolean }) {
  const meaning = numerologyMeaning(number, language)
  return <article className={`numerology-card ${emphasis ? 'numerology-card-hero' : ''}`} style={{ '--number-color': meaning.color } as React.CSSProperties}>
    <div className="numerology-card-head"><span className="numerology-number">{number}</span><div><p className="numerology-label">{label}</p><p className="numerology-title">{meaning.title}</p></div></div>
    <p className="numerology-description">{meaning.description}</p>
    {trail && <p className="numerology-trail">{trail}</p>}
  </article>
}

export function NumerologyTool() {
  const { language, t } = useTranslation()
  const [date, setDate] = useState('1995-05-15')
  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)
  const today = useMemo(() => todayIso(), [])
  const result = useMemo(() => { try { return numerologyFromDate(date) } catch { return null } }, [date])
  const cycle = useMemo(() => { try { return personalCycle(date) } catch { return null } }, [date])
  const nameResult = useMemo(() => numerologyFromName(name), [name])
  const digits = (iso: string) => iso.replace(/-/g, '').split('').join('+')
  const parts = { day: Number(date.slice(8, 10)), month: Number(date.slice(5, 7)), year: Number(date.slice(0, 4)) }
  const reduced = { day: reduceNumber(parts.day), month: reduceNumber(parts.month), year: reduceNumber(parts.year) }
  const labels = (key: keyof typeof NUMEROLOGY_LABELS) => NUMEROLOGY_LABELS[key][language]
  const summary = result ? [
    `${t('Numeroloji profilim', 'My numerology profile', 'Мой нумерологический профиль')} · ${formatDate(date, language)}`,
    `${labels('lifePath')}: ${result.lifePath} · ${labels('birthday')}: ${result.birthday} · ${labels('attitude')}: ${result.attitude}`,
    cycle ? `${cycle.calendarYear} ${labels('personalYear').toLocaleLowerCase(language)}: ${cycle.year}` : '',
    nameResult ? `${t('Kader', 'Expression', 'Число судьбы')}: ${nameResult.expression} · ${t('Ruh', 'Soul urge', 'Число души')}: ${nameResult.soulUrge} · ${t('Kişilik', 'Personality', 'Число личности')}: ${nameResult.personality}` : '',
    'tools.mucahid.dev/tools/numerology-calculator',
  ].filter(Boolean).join('\n') : ''
  const copy = async () => { try { await navigator.clipboard.writeText(summary); setCopied(true) } catch { setCopied(false) } }
  return <div className="space-y-4">
    <Panel>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
        <DateField name="birthDate" label={t('Doğum tarihi', 'Date of birth', 'Дата рождения')} value={date} onChange={setDate} minYear={1900} maxYear={new Date().getFullYear()} />
        <Field name="name" type="text" label={t('Tam adın (isteğe bağlı)', 'Full name (optional)', 'Полное имя (необязательно)')} value={name} onChange={setName} placeholder={t('Örn. Ayşe Yılmaz', 'e.g. Jane Smith', 'напр. Анна Иванова')} hint={t('İsim sayıları için Pisagor tablosu kullanılır; Türkçe harfler temel harfe eşlenir.', 'Name numbers use the Pythagorean table; Turkish letters map to their base letter.', 'Числа имени считаются по пифагорейской таблице; кириллица транслитерируется, турецкие буквы сводятся к базовым латинским.')} />
      </div>
      <p className="mt-4 text-[.74rem] leading-relaxed text-[#7a8699]">{t('Numeroloji bilimsel bir kişilik ölçümü değildir. Sayıları kendini düşünmek için bir çerçeve olarak kullan; hesaplama tarayıcında yapılır.', 'Numerology is not a scientific personality measure. Use the numbers as a frame for reflection; everything is computed in your browser.', 'Нумерология не является научным измерением личности. Используйте числа как повод для размышлений; всё считается в вашем браузере.')}</p>
    </Panel>

    {result && cycle ? <>
      <section className="numerology-hero" aria-label={t('Yaşam yolu', 'Life path', 'Жизненный путь')} style={{ '--number-color': numerologyMeaning(result.lifePath, language).color } as React.CSSProperties}>
        <div className="numerology-hero-number"><span>{result.lifePath}</span><small>{labels('lifePath')}</small></div>
        <div className="numerology-hero-body">
          <p className="text-[.72rem] font-bold uppercase tracking-[.12em] text-[#7d99d7]">{t('Çekirdek sayın', 'Your core number', 'Ваше главное число')}</p>
          <h2 className="mt-1 font-display text-[1.5rem] font-extrabold tracking-[-.03em] text-[#1c2846]">{numerologyMeaning(result.lifePath, language).title}</h2>
          <p className="mt-2 text-[.86rem] leading-relaxed text-[#4d5b78]">{numerologyMeaning(result.lifePath, language).description} {t('Yaşam yolu, doğum tarihinin tamamından türetilir ve genel eğilimlerin çerçevesi sayılır.', 'The life path is derived from your whole birth date and is read as the frame of your general tendencies.', 'Число жизненного пути выводится из полной даты рождения и описывает общие склонности.')}</p>
          <p className="numerology-trail mt-3">{t('Hesap', 'Calculation', 'Расчёт')}: {t('gün', 'day', 'день')} {reductionTrail(parts.day)} · {t('ay', 'month', 'месяц')} {reductionTrail(parts.month)} · {t('yıl', 'year', 'год')} {reductionTrail(parts.year)} → {reduced.day} + {reduced.month} + {reduced.year} = {reductionTrail(Number(reduced.day) + Number(reduced.month) + Number(reduced.year))}</p>
          <div className="mt-4 flex flex-wrap gap-2">{result.scores.slice(1).map((score) => <span key={score.key} className="numerology-chip" style={{ '--number-color': score.color } as React.CSSProperties}><b>{score.display}</b>{score.key === 'personalYear' ? `${cycle.calendarYear} ${labels('personalYear').toLocaleLowerCase(language)}` : labels(score.key)}</span>)}<QuietButton onClick={copy} pressed={copied} className="ml-auto">{copied ? <Check className="size-3.5 text-[#4b9e82]" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}{copied ? t('Kopyalandı', 'Copied', 'Скопировано') : t('Profili kopyala', 'Copy profile', 'Копировать профиль')}</QuietButton></div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel className="!p-4"><NumerologyWheel centerLabel={String(result.lifePath)} centerCaption={labels('lifePath').toLocaleLowerCase(language)} ariaLabel={t('Numeroloji sayı çemberi', 'Numerology number wheel', 'Круг чисел нумерологии')} values={result.scores.map((score) => ({ label: score.key === 'personalYear' ? `${cycle.calendarYear} ${labels('personalYear').toLocaleLowerCase(language)}` : labels(score.key), number: score.display, position: wheelPosition(score.display), color: score.color }))} /></Panel>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberCard number={result.birthday} label={labels('birthday')} trail={reductionTrail(parts.day)} language={language} />
          <NumberCard number={result.attitude} label={labels('attitude')} trail={`${parts.day} + ${parts.month} = ${reductionTrail(parts.day + parts.month)}`} language={language} />
          <NumberCard number={cycle.year} label={`${cycle.calendarYear} ${labels('personalYear').toLocaleLowerCase(language)}`} trail={`${parts.day} + ${parts.month} + ${cycle.calendarYear} = ${reductionTrail(parts.day + parts.month + cycle.calendarYear)}`} language={language} />
          <article className="numerology-card"><p className="numerology-label">{t('Ham toplam', 'Raw digit sum', 'Сумма всех цифр')}</p><p className="numerology-title">{digits(date)} = {result.rawLifePath}</p><p className="numerology-description">{t('Tüm rakamların toplamı; yaşam yolu, gün–ay–yıl ayrı indirgenerek bulunduğu için bazen farklı çıkar ve ana sayılar (11, 22, 33) korunur.', 'The sum of every digit; the life path reduces day, month and year separately, so it can differ, and master numbers (11, 22, 33) are preserved.', 'Сумма всех цифр; число жизненного пути сводит день, месяц и год по отдельности, поэтому может отличаться, а мастер-числа (11, 22, 33) сохраняются.')}</p></article>
        </div>
      </div>

      <Panel>
        <h3 className="font-display text-[1.05rem] font-extrabold text-[#1c2846]">{t('Bugünün döngüsü', 'Today’s cycle', 'Цикл на сегодня')} · {formatDate(today, language)}</h3>
        <p className="mt-1 text-[.76rem] text-[#7a8699]">{t('Kişisel yıl dokuz yıllık bir döngü olarak okunur; ay ve gün sayıları aynı mantıkla türetilir.', 'The personal year is read as a nine-year cycle; month and day numbers are derived the same way.', 'Личный год читается как девятилетний цикл; числа месяца и дня выводятся так же.')}</p>
        <ol className="numerology-cycle mt-4" aria-label={t('Dokuz yıllık döngü', 'Nine-year cycle', 'Девятилетний цикл')}>{Array.from({ length: 9 }, (_, index) => index + 1).map((step) => { const number = step as NumerologyNumber; const active = wheelPosition(cycle.year) === step; return <li key={step} className={active ? 'is-active' : undefined} style={{ '--number-color': numerologyMeaning(number, language).color } as React.CSSProperties}><b>{step}</b><span>{numerologyMeaning(number, language).title}</span></li> })}</ol>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <NumberCard number={cycle.year} label={`${labels('personalYear')} · ${cycle.calendarYear}`} language={language} />
          <NumberCard number={cycle.month} label={`${t('Kişisel ay', 'Personal month', 'Личный месяц')} · ${monthName(cycle.calendarMonth - 1, language, 'long')}`} trail={`${cycle.year} + ${cycle.calendarMonth} = ${reductionTrail(Number(cycle.year) + cycle.calendarMonth)}`} language={language} />
          <NumberCard number={cycle.day} label={`${t('Kişisel gün', 'Personal day', 'Личный день')} · ${cycle.calendarDay}`} trail={`${cycle.month} + ${cycle.calendarDay} = ${reductionTrail(Number(cycle.month) + cycle.calendarDay)}`} language={language} />
        </div>
      </Panel>

      {nameResult && <Panel>
        <h3 className="font-display text-[1.05rem] font-extrabold text-[#1c2846]">{t('İsim sayıların', 'Your name numbers', 'Числа вашего имени')}</h3>
        <p className="mt-1 text-[.76rem] text-[#7a8699]">{t(`${nameResult.letters} harf sayıldı. Sesli harfler ruh dürtüsünü, sessizler kişiliği, tümü kader (ifade) sayısını verir.`, `${nameResult.letters} letters counted. Vowels give the soul urge, consonants the personality, and all letters the expression number.`, `Учтено букв: ${nameResult.letters}. Гласные дают число души, согласные — число личности, все буквы — число судьбы.`)}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberCard number={nameResult.expression} label={t('Kader / ifade', 'Expression / destiny', 'Число судьбы')} trail={reductionTrail(nameResult.expressionSum)} language={language} emphasis />
          <NumberCard number={nameResult.soulUrge} label={t('Ruh dürtüsü', 'Soul urge', 'Число души')} trail={reductionTrail(nameResult.soulUrgeSum)} language={language} />
          <NumberCard number={nameResult.personality} label={t('Kişilik', 'Personality', 'Число личности')} trail={reductionTrail(nameResult.personalitySum)} language={language} />
          <NumberCard number={maturityNumber(result.lifePath, nameResult.expression)} label={t('Olgunluk', 'Maturity', 'Число зрелости')} trail={`${result.lifePath} + ${nameResult.expression} = ${reductionTrail(Number(result.lifePath) + Number(nameResult.expression))}`} language={language} />
        </div>
      </Panel>}

      <Note>{t('Yöntem: gün, ay ve yıl ayrı ayrı tek haneye indirgenir, toplamları yaşam yolunu verir; 11, 22 ve 33 ana sayı olarak korunur. Tutum = gün + ay. Kişisel yıl = gün + ay + içinde bulunulan yıl; kişisel ay ve gün bunun üzerine eklenir. İsim sayıları Pisagor tablosunu (A=1 … I=9, J=1 …) kullanır.', 'Method: day, month and year are each reduced to one digit and summed for the life path; 11, 22 and 33 are kept as master numbers. Attitude = day + month. Personal year = day + month + current year; personal month and day build on it. Name numbers use the Pythagorean table (A=1 … I=9, J=1 …).', 'Метод: день, месяц и год сводятся к одной цифре и складываются в число жизненного пути; 11, 22 и 33 сохраняются как мастер-числа. Число отношения = день + месяц. Личный год = день + месяц + текущий год; личные месяц и день строятся на нём. Числа имени — по пифагорейской таблице (A=1 … I=9, J=1 …).')}</Note>
    </> : <Note tone="warning">{t('Geçerli bir doğum tarihi gir.', 'Enter a valid date of birth.', 'Введите корректную дату рождения.')}</Note>}
  </div>
}
