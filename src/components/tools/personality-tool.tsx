'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Copy, RotateCcw, Sparkles } from 'lucide-react'
import { useToolHistoryField } from '@/components/tool-history'
import { useTranslation } from '@/hooks/use-language'
import type { Language } from '@/lib/format'
import { CLARITY_LABELS, DIMENSION_QUESTIONS, DIMENSIONS, ITEMS, isResponse, LETTERS, neighbouringTypes, normalizeResponses, PAGE_SIZE, PAIRS, scoreResponses, serializeResponses, TYPES, type Letter, type PersonalityResult, type Response } from '@/lib/personality'
import { Note, Panel, QuietButton, Submit } from './shared'

type Stage = 'intro' | 'quiz' | 'result'
const SCALE: Response[] = [1, 2, 3, 4, 5]
const pageCount = Math.ceil(ITEMS.length / PAGE_SIZE)
const emptySheet = () => Array<Response | undefined>(ITEMS.length).fill(undefined)

export function PersonalityTool() {
  const { language, t } = useTranslation()
  const [responses, setResponses] = useState<(Response | undefined)[]>(emptySheet)
  const [stage, setStage] = useState<Stage>('intro')
  const [page, setPage] = useState(0)
  const [showMissing, setShowMissing] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  const result = useMemo(() => scoreResponses(responses), [responses])
  useToolHistoryField({
    name: 'responses', label: t('Cevaplar', 'Answers', 'Ответы'), value: serializeResponses(responses),
    onRestore: (value) => { try { const next = normalizeResponses(JSON.parse(String(value))); setResponses(next); const scored = scoreResponses(next); if (scored.complete) setStage('result'); else { setStage('quiz'); setPage(Math.min(pageCount - 1, Math.floor(next.findIndex((response) => !isResponse(response)) / PAGE_SIZE))) } } catch { /* Ignore malformed local history. */ } },
    format: (value, lang) => { try { const scored = scoreResponses(normalizeResponses(JSON.parse(String(value)))); return scored.complete ? `${lang === 'tr' ? 'Sonuç' : 'Result'}: ${scored.pattern}` : `${scored.answered}/${scored.total} ${lang === 'tr' ? 'cevap' : 'answered'}` } catch { return null } },
  })
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    topRef.current?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })
  }, [page, stage])

  const pageItems = ITEMS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pageComplete = pageItems.every((item) => isResponse(responses[item.id - 1]))
  const answer = (index: number, value: Response) => setResponses((current) => current.map((item, position) => (position === index ? value : item)))
  const restart = () => { setResponses(emptySheet()); setPage(0); setShowMissing(false); setStage('intro') }
  const next = () => {
    if (!pageComplete) { setShowMissing(true); return }
    setShowMissing(false)
    if (page === pageCount - 1) setStage('result')
    else setPage((value) => value + 1)
  }

  return <div ref={topRef} className="scroll-mt-24">
    {stage === 'intro' && <Panel>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#eef2ff] px-3 py-1 text-[.7rem] font-bold text-[#4058b8]"><Sparkles className="size-3.5" aria-hidden="true" />{t('32 madde · yaklaşık 5 dakika', '32 items · about 5 minutes', '32 утверждения · около 5 минут')}</p>
          <h2 className="mt-3 font-display text-[1.45rem] font-extrabold tracking-[-.03em] text-[#1c2846]">{t('Dört boyutta tercihlerini keşfet', 'Explore your preferences on four dimensions', 'Изучите свои предпочтения по четырём шкалам')}</h2>
          <p className="mt-2 text-[.86rem] leading-relaxed text-[#66728a]">{t('Her maddede iki ifade göreceksin. Sana daha yakın olanı ve ne kadar yakın olduğunu beş noktalı ölçekte işaretle. Doğru ya da yanlış cevap yok; ilk aklına geleni seç.', 'Each item shows two statements. Mark which one is closer to you, and how much, on a five-point scale. There are no right or wrong answers; go with your first instinct.', 'В каждом пункте два утверждения. Отметьте по пятибалльной шкале, какое вам ближе и насколько. Правильных и неправильных ответов нет — доверьтесь первому импульсу.')}</p>
          <ul className="mt-4 grid gap-2 text-[.8rem] text-[#4d5b78] sm:grid-cols-2">{DIMENSIONS.map((dimension) => <li key={dimension} className="rounded-xl bg-[#f7f9fd] px-3.5 py-3"><p className="font-bold text-[#2f4470]">{DIMENSION_QUESTIONS[dimension][language]}</p><p className="mt-1 text-[.74rem] text-[#7a8699]">{LETTERS[PAIRS[dimension][0]].title[language]} <span className="text-[#b3bccc]">↔</span> {LETTERS[PAIRS[dimension][1]].title[language]}</p></li>)}</ul>
          <div className="mt-6 flex flex-wrap items-center gap-3"><Submit onClick={() => { setStage('quiz'); setPage(0) }}>{result.answered > 0 && !result.complete ? t('Kaldığın yerden devam et', 'Continue where you left off', 'Продолжить с того места') : t('Teste başla', 'Start the test', 'Начать тест')}<ArrowRight className="size-4" aria-hidden="true" /></Submit>{result.complete && <QuietButton onClick={() => setStage('result')}>{t('Son sonucu gör', 'View last result', 'Показать последний результат')}</QuietButton>}{result.answered > 0 && <span className="text-[.72rem] text-[#8b97ab]">{result.answered}/{result.total} {t('cevaplandı', 'answered', 'отвечено')}</span>}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-[#f5f8ff] to-[#fbf7ff] p-5 text-[.76rem] leading-relaxed text-[#66728a]">
          <p className="font-bold text-[#2f4470]">{t('Bilmen gerekenler', 'Good to know', 'Полезно знать')}</p>
          <ul className="mt-2 grid gap-2 list-disc pl-4"><li>{t('Bu özgün envanter resmî MBTI® testi değildir; Jung’un tercih boyutlarını temel alan bir düşünme aracıdır.', 'This original inventory is not the official MBTI® assessment; it is a reflection tool based on Jung’s preference dimensions.', 'Этот авторский опросник не является официальным тестом MBTI®; это инструмент для размышлений на основе юнгианских шкал предпочтений.')}</li><li>{t('Tercihler kesin kategoriler değil, süreklilik gösterir. Sonuç, harflerle birlikte her boyuttaki tercih gücünü de gösterir.', 'Preferences are continuous, not boxes. Your result shows the strength of each preference alongside the letters.', 'Предпочтения — это непрерывная шкала, а не ярлыки. Результат показывает силу каждого предпочтения вместе с буквами.')}</li><li>{t('Tip testlerinin tekrar-güvenilirliği sınırlıdır; işe alım veya klinik kararlar için kullanılmamalıdır.', 'Type inventories have limited test–retest reliability and must not be used for hiring or clinical decisions.', 'Типологические опросники имеют ограниченную ретестовую надёжность и не должны использоваться при найме или в клинических решениях.')}</li><li>{t('Cevapların yalnızca bu tarayıcıda kalır.', 'Your answers stay in this browser only.', 'Ваши ответы остаются только в этом браузере.')}</li></ul>
        </div>
      </div>
    </Panel>}

    {stage === 'quiz' && <Panel>
      <div className="sticky top-[4.5rem] z-10 -mx-5 -mt-5 rounded-t-3xl border-b border-[#eef1f6] bg-white/95 px-5 pb-3 pt-4 backdrop-blur sm:-mx-7 sm:-mt-7 sm:px-7">
        <div className="flex items-center justify-between text-[.72rem] font-semibold text-[#70819d]"><span>{t('Bölüm', 'Section', 'Раздел')} {page + 1}/{pageCount} · {DIMENSION_QUESTIONS[pageItems[0].dimension][language]}</span><span>{result.answered}/{result.total}</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8edf7]" role="progressbar" aria-valuemin={0} aria-valuemax={result.total} aria-valuenow={result.answered} aria-label={t('İlerleme', 'Progress', 'Прогресс')}><div className="h-full rounded-full bg-[#5e7fdd] transition-[width]" style={{ width: `${(result.answered / result.total) * 100}%` }} /></div>
      </div>
      <p className="mt-5 text-[.78rem] text-[#7a8699]">{t('Soldaki ifadeye ne kadar yakınsan sola, sağdakine ne kadar yakınsan sağa doğru işaretle. Orta nokta “ikisi de / kararsızım” demektir.', 'Mark towards the left the closer you feel to the left statement, towards the right for the right one. The middle means “both / not sure”.', 'Отмечайте ближе к левому краю, если вам ближе левое утверждение, и к правому — если правое. Середина означает «и то и другое / не уверен».')}</p>
      <ol className="mt-4 grid gap-3">
        {pageItems.map((item) => {
          const value = responses[item.id - 1]
          const missing = showMissing && !isResponse(value)
          return <li key={item.id} className={`rounded-2xl border p-4 transition ${missing ? 'border-[#e8a0aa] bg-[#fff7f8]' : isResponse(value) ? 'border-[#dbe4f5] bg-[#fbfcff]' : 'border-[#e6ebf3] bg-white'}`}>
            <fieldset>
              <legend className="sr-only">{t('Madde', 'Item', 'Пункт')} {item.id}</legend>
              <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
                <p className={`text-[.83rem] font-semibold leading-relaxed text-[#33425f] lg:text-right ${value !== undefined && value < 3 ? 'text-[#2e55b8]' : ''}`}>{item.leftText[language]}</p>
                <div className="flex items-center justify-center gap-2" role="radiogroup" aria-label={`${item.leftText[language]} — ${item.rightText[language]}`}>
                  {SCALE.map((option) => {
                    const size = option === 3 ? 'size-7' : option === 2 || option === 4 ? 'size-8' : 'size-9'
                    const active = value === option
                    return <label key={option} className="grid place-items-center">
                      <input type="radio" name={`item-${item.id}`} value={option} checked={active} onChange={() => answer(item.id - 1, option)} className="peer sr-only" aria-label={option === 1 ? t('Kesinlikle sol', 'Strongly left', 'Точно левое') : option === 2 ? t('Biraz sol', 'Somewhat left', 'Скорее левое') : option === 3 ? t('Kararsızım', 'Not sure', 'Не уверен') : option === 4 ? t('Biraz sağ', 'Somewhat right', 'Скорее правое') : t('Kesinlikle sağ', 'Strongly right', 'Точно правое')} />
                      <span className={`${size} grid cursor-pointer place-items-center rounded-full border-2 transition peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-[rgba(73,119,237,.38)] ${active ? (option === 3 ? 'border-[#9aa6ba] bg-[#9aa6ba]' : option < 3 ? 'border-[#5e7fdd] bg-[#5e7fdd]' : 'border-[#8f83d9] bg-[#8f83d9]') : option === 3 ? 'border-[#c9d1de] hover:bg-[#f1f3f7]' : option < 3 ? 'border-[#b7c6ec] hover:bg-[#eef2ff]' : 'border-[#cbc4ec] hover:bg-[#f3f0ff]'}`}>{active && <Check className="size-4 text-white" aria-hidden="true" />}</span>
                    </label>
                  })}
                </div>
                <p className={`text-[.83rem] font-semibold leading-relaxed text-[#33425f] ${value !== undefined && value > 3 ? 'text-[#6a55c9]' : ''}`}>{item.rightText[language]}</p>
              </div>
            </fieldset>
          </li>
        })}
      </ol>
      {showMissing && !pageComplete && <p role="alert" className="mt-3 text-[.76rem] font-semibold text-[#c64a57]">{t('Devam etmek için bu bölümdeki tüm maddeleri işaretle; kararsızsan orta noktayı seçebilirsin.', 'Answer every item in this section to continue; pick the middle point if you are unsure.', 'Чтобы продолжить, ответьте на все пункты раздела; если не уверены, выберите середину.')}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <QuietButton onClick={() => (page === 0 ? setStage('intro') : setPage((value) => value - 1))}><ArrowLeft className="size-3.5" aria-hidden="true" />{page === 0 ? t('Giriş', 'Intro', 'Введение') : t('Önceki bölüm', 'Previous section', 'Предыдущий раздел')}</QuietButton>
        <div className="flex items-center gap-2">{result.answered > 0 && <QuietButton onClick={restart}><RotateCcw className="size-3.5" aria-hidden="true" />{t('Sıfırla', 'Reset', 'Сбросить')}</QuietButton>}<Submit onClick={next}>{page === pageCount - 1 ? t('Sonucu gör', 'See result', 'Показать результат') : t('Sonraki bölüm', 'Next section', 'Следующий раздел')}<ArrowRight className="size-4" aria-hidden="true" /></Submit></div>
      </div>
    </Panel>}

    {stage === 'result' && <ResultView result={result} language={language} t={t} onRestart={restart} onReview={() => { setStage('quiz'); setPage(0) }} />}
  </div>
}

function ResultView({ result, language, t, onRestart, onReview }: { result: PersonalityResult; language: Language; t: (a: string, b: string, c?: string) => string; onRestart: () => void; onReview: () => void }) {
  const [copied, setCopied] = useState(false)
  const profile = result.type ? TYPES[result.type] : null
  const neighbours = neighbouringTypes(result).slice(0, 2)
  const leaningLetters = result.dimensions.flatMap((dimension) => (dimension.leaning ? [dimension.leaning] : [...dimension.letters]))
  const summaryText = [
    `${t('Kişilik tipi sonucum', 'My personality type result', 'Мой результат теста типа личности')}: ${result.pattern}${profile ? ` · ${profile.title[language]}` : ''}`,
    ...result.dimensions.map((dimension) => `${dimension.letters[0]}/${dimension.letters[1]}: ${dimension.leaning ?? t('dengede', 'balanced', 'баланс')} ${dimension.strength}% (${CLARITY_LABELS[dimension.clarity][language]})`),
    'tools.mucahid.dev/tools/mbti-personality-test',
  ].join('\n')
  const copy = async () => { try { await navigator.clipboard.writeText(summaryText); setCopied(true) } catch { setCopied(false) } }
  return <div className="space-y-4" aria-live="polite">
    <Panel className="bg-gradient-to-br from-[#f7f9ff] via-white to-[#fbf7ff]">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="mbti-type mbti-type-large" aria-label={result.pattern}>{result.dimensions.map((dimension) => <span key={dimension.dimension} className={dimension.leaning ? 'mbti-slot' : 'mbti-slot mbti-slot-balanced'} title={dimension.leaning ? LETTERS[dimension.leaning].title[language] : t('Dengede', 'Balanced', 'Баланс')}>{dimension.leaning ?? <>{dimension.letters[0]}<small>/</small>{dimension.letters[1]}</>}</span>)}</div>
        <div>
          <p className="text-[.72rem] font-bold uppercase tracking-[.12em] text-[#7d99d7]">{result.type ? t('Yaklaşık tipin', 'Your approximate type', 'Ваш приблизительный тип') : t('Belirgin bir tip çıkmadı', 'No single type emerged', 'Единый тип не определился')}</p>
          <h2 className="mt-1 font-display text-[1.6rem] font-extrabold tracking-[-.03em] text-[#1c2846]">{profile ? profile.title[language] : result.possibleTypes.length <= 4 ? result.possibleTypes.join(' · ') : t(`${result.possibleTypes.length} olası tip`, `${result.possibleTypes.length} possible types`, `Возможных типов: ${result.possibleTypes.length}`)}</h2>
          <p className="mt-2 text-[.86rem] leading-relaxed text-[#4d5b78]">{profile ? profile.summary[language] : t('Bir veya daha fazla boyutta iki tarafa eşit puan verdin. Bu, bir hata değil: o boyutta her iki tercihi de kullandığın anlamına gelir. Aşağıdaki çubuklar hangi boyutların dengede kaldığını gösterir.', 'You scored equally on both sides of one or more dimensions. That is not an error: it means you use both preferences there. The bars below show which dimensions stayed balanced.', 'По одной или нескольким шкалам вы набрали поровну с обеих сторон. Это не ошибка: значит, там вы используете оба предпочтения. Полосы ниже показывают, какие шкалы остались в балансе.')}</p>
          <div className="mt-4 flex flex-wrap gap-2"><QuietButton onClick={copy} pressed={copied}>{copied ? <Check className="size-3.5 text-[#4b9e82]" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}{copied ? t('Kopyalandı', 'Copied', 'Скопировано') : t('Sonucu kopyala', 'Copy result', 'Копировать результат')}</QuietButton><QuietButton onClick={onReview}>{t('Cevapları gözden geçir', 'Review answers', 'Просмотреть ответы')}</QuietButton><QuietButton onClick={onRestart}><RotateCcw className="size-3.5" aria-hidden="true" />{t('Yeniden başla', 'Start over', 'Начать заново')}</QuietButton></div>
        </div>
      </div>
    </Panel>

    <Panel>
      <h3 className="font-display text-[1.05rem] font-extrabold text-[#1c2846]">{t('Boyutlara göre tercih gücü', 'Preference strength by dimension', 'Сила предпочтений по шкалам')}</h3>
      <p className="mt-1 text-[.76rem] text-[#7a8699]">{t('Çubuk, cevaplarının hangi tarafa ne kadar yığıldığını gösterir. Yüzde, tercih gücüdür; “ne kadar iyi” olduğunu değil, ne kadar tutarlı seçtiğini anlatır.', 'Each bar shows how far your answers leaned to one side. The percentage is preference strength: how consistently you chose, not how “good” you are.', 'Каждая полоса показывает, насколько ваши ответы склонялись в одну сторону. Процент — это сила предпочтения: насколько последовательно вы выбирали, а не насколько вы «хороши».')}</p>
      <div className="mt-5 grid gap-4">{result.dimensions.map((dimension) => <div key={dimension.dimension} className="grid gap-2">
        <div className="flex items-center justify-between text-[.74rem] font-semibold text-[#5f6d8a]"><span>{DIMENSION_QUESTIONS[dimension.dimension][language]}</span><span className="text-[#8b97ab]">{dimension.leaning ? `${LETTERS[dimension.leaning].title[language]} · ${dimension.strength}% · ${CLARITY_LABELS[dimension.clarity][language]}` : CLARITY_LABELS.balanced[language]}</span></div>
        <div className="grid grid-cols-[2.2rem_1fr_2.2rem] items-center gap-2">
          <span className={`text-center font-display text-lg font-extrabold ${dimension.leaning === dimension.letters[0] ? 'text-[#2e55b8]' : 'text-[#b3bccc]'}`}>{dimension.letters[0]}</span>
          <div className="preference-bar" role="img" aria-label={`${dimension.letters[0]} ${dimension.firstShare}% – ${dimension.letters[1]} ${100 - dimension.firstShare}%`}><span className="preference-bar-left" style={{ width: `${dimension.firstShare}%` }} /><span className="preference-bar-right" style={{ width: `${100 - dimension.firstShare}%` }} /><i style={{ left: `${dimension.firstShare}%` }} /></div>
          <span className={`text-center font-display text-lg font-extrabold ${dimension.leaning === dimension.letters[1] ? 'text-[#6a55c9]' : 'text-[#b3bccc]'}`}>{dimension.letters[1]}</span>
        </div>
      </div>)}</div>
    </Panel>

    <div className="grid gap-3 sm:grid-cols-2">{leaningLetters.map((letter: Letter) => <div key={letter} className="rounded-2xl border border-[#e7ecf5] bg-white p-4"><p className="font-display text-lg font-extrabold text-[#506bc5]">{letter} <span className="text-[.8rem] font-bold text-[#3b4a66]">· {LETTERS[letter].title[language]}</span></p><p className="mt-1 text-[.76rem] leading-relaxed text-[#6d7b95]">{LETTERS[letter].summary[language]}</p><p className="mt-2 text-[.7rem] text-[#94a0b4]">{t('Belirtileri', 'Signs', 'Признаки')}: {LETTERS[letter].signs[language]}</p></div>)}</div>

    {profile && <Panel>
      <div className="grid gap-5 md:grid-cols-2">
        <div><h3 className="text-[.72rem] font-bold uppercase tracking-[.12em] text-[#4b9e82]">{t('Güçlü yanlar', 'Strengths', 'Сильные стороны')}</h3><ul className="mt-2 grid gap-1.5 text-[.82rem] text-[#3b4a66]">{profile.strengths.map((line) => <li key={line.en} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-[#4b9e82]" aria-hidden="true" />{line[language]}</li>)}</ul></div>
        <div><h3 className="text-[.72rem] font-bold uppercase tracking-[.12em] text-[#d19a3c]">{t('Gelişim alanları', 'Growth areas', 'Зоны роста')}</h3><ul className="mt-2 grid gap-1.5 text-[.82rem] text-[#3b4a66]">{profile.growth.map((line) => <li key={line.en} className="flex gap-2"><Sparkles className="mt-0.5 size-4 shrink-0 text-[#d19a3c]" aria-hidden="true" />{line[language]}</li>)}</ul></div>
        <div className="rounded-xl bg-[#f7f9fd] p-4"><p className="text-[.7rem] font-bold text-[#70809c]">{t('İş yaşamında', 'At work', 'В работе')}</p><p className="mt-1 text-[.8rem] leading-relaxed text-[#3b4a66]">{profile.work[language]}</p></div>
        <div className="rounded-xl bg-[#f7f9fd] p-4"><p className="text-[.7rem] font-bold text-[#70809c]">{t('İlişkilerde', 'In relationships', 'В отношениях')}</p><p className="mt-1 text-[.8rem] leading-relaxed text-[#3b4a66]">{profile.relationships[language]}</p></div>
      </div>
      {neighbours.length > 0 && <p className="mt-5 text-[.74rem] text-[#7a8699]">{t('En zayıf tercihlerin değişirse yakın tipler', 'Nearby types if your weakest preferences flipped', 'Соседние типы, если бы слабейшие предпочтения изменились')}: {neighbours.map((type) => <span key={type} className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#eef2ff] px-2.5 py-0.5 font-bold text-[#4058b8]">{type} <span className="font-normal text-[#7a8699]">· {TYPES[type]?.title[language]}</span></span>)}</p>}
    </Panel>}

    <Note>{t('Sonuç yalnızca bugün verdiğin cevapları özetler; ruh hali ve bağlam cevapları değiştirebilir. Tip modelleri kişiliği tam olarak ölçmez; Beş Faktör gibi boyutsal modeller araştırmalarda daha güçlü destek bulur. Bu sonucu bir etiket değil, kendini düşünmek için bir başlangıç olarak kullan.', 'The result only summarises the answers you gave today; mood and context can change them. Type models do not fully measure personality; dimensional models such as the Big Five have stronger research support. Use this as a starting point for reflection, not a label.', 'Результат лишь обобщает ответы, данные сегодня; настроение и контекст могут их изменить. Типологические модели не измеряют личность полностью; дименсиональные модели, такие как «Большая пятёрка», имеют более сильную научную поддержку. Используйте это как отправную точку для размышлений, а не как ярлык.')}</Note>
  </div>
}
