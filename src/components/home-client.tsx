'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ArrowRightLeft, Calculator, Coins, Gift, Grid2X2, LockKeyhole, MousePointer2, Percent, Pin, PinOff, Search, ShieldCheck, Sparkles, TrendingUp, X, Zap } from 'lucide-react'
import { useTranslation, type Language } from '@/hooks/use-language'
import { categories, categoryNames, toolCopy, toolEnglish, toolRussian, tools, type ToolCategory, type ToolDefinition } from '@/lib/tools'
import { DEFAULT_TOOL_SORT, getActivePromotion, isToolSort, normalizePins, PINNED_TOOLS_STORAGE_KEY, sortTools, togglePin, TOOL_USAGE_EVENT, type ToolSort } from '@/lib/tool-ranking'
import { SelectField } from '@/components/ui/select-field'
import { ToolArtwork } from '@/components/tool-artwork'
import { ToolIcon, toolIcons } from '@/components/tool-icon'

const FEATURED_COUNT = 6
const allSlugs = tools.map((tool) => tool.slug)
const isCategory = (value: string | null): value is ToolCategory | 'Tümü' => categories.some((item) => item.label === value)
const HERO_CHIPS = [
  { icon: Coins, left: '4%', top: '78%', depth: 1.6, delay: '0s', size: 42 },
  { icon: Percent, left: '21%', top: '34%', depth: 2.2, delay: '-2.1s', size: 46 },
  { icon: ArrowRightLeft, left: '31%', top: '8%', depth: 1.1, delay: '-4.6s', size: 36 },
  { icon: LockKeyhole, left: '66%', top: '8%', depth: 1.3, delay: '-5.5s', size: 38 },
  { icon: Calculator, left: '79%', top: '62%', depth: 1.8, delay: '-3.4s', size: 44 },
  { icon: TrendingUp, left: '94%', top: '80%', depth: 2.6, delay: '-1.2s', size: 42 },
]

function readPins() {
  try { return normalizePins(JSON.parse(localStorage.getItem(PINNED_TOOLS_STORAGE_KEY) ?? '[]'), allSlugs) } catch { return [] }
}
function writePins(pinned: string[]) {
  try { localStorage.setItem(PINNED_TOOLS_STORAGE_KEY, JSON.stringify(pinned)) } catch { /* Storage is optional. */ }
}

/** A floating tool chip: when the pointer touches it, it is knocked away and stays where it lands. */
function HeroChip({ icon: Icon, left, top, depth, delay, size }: (typeof HERO_CHIPS)[number]) {
  const ref = useRef<HTMLSpanElement>(null)
  const offset = useRef({ x: 0, y: 0, angle: 0 })
  const knock = (event: React.PointerEvent<HTMLSpanElement>) => {
    const chip = ref.current
    const hero = chip?.closest<HTMLElement>('.home-hero')
    if (!chip || !hero || event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = chip.getBoundingClientRect(), bounds = hero.getBoundingClientRect()
    const dx = rect.left + rect.width / 2 - event.clientX, dy = rect.top + rect.height / 2 - event.clientY
    const length = Math.hypot(dx, dy) || 1
    const distance = 110 + Math.random() * 60
    const next = { x: offset.current.x + (dx / length) * distance, y: offset.current.y + (dy / length) * distance, angle: offset.current.angle + (dx / length) * -28 + (Math.random() - 0.5) * 12 }
    // Keep the chip inside the hero so it never lands on the catalog or under the header.
    const baseLeft = rect.left - bounds.left - offset.current.x, baseTop = rect.top - bounds.top - offset.current.y
    next.x = Math.min(bounds.width - rect.width - 8 - baseLeft, Math.max(8 - baseLeft, next.x))
    next.y = Math.min(bounds.height - rect.height - 8 - baseTop, Math.max(8 - baseTop, next.y))
    offset.current = next
    chip.style.setProperty('--ox', `${next.x.toFixed(1)}px`)
    chip.style.setProperty('--oy', `${next.y.toFixed(1)}px`)
    chip.style.setProperty('--or', `${next.angle.toFixed(1)}deg`)
    chip.querySelector<HTMLElement>('.hero-chip-float')?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.25 }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' })
  }
  return <span ref={ref} className="hero-chip" style={{ left, top, width: size, height: size, '--depth': depth, '--delay': delay } as React.CSSProperties} onPointerEnter={knock}><span className="hero-chip-knock"><span className="hero-chip-float"><Icon size={Math.round(size * 0.46)} strokeWidth={1.7} /></span></span></span>
}

/** Splits the headline into words so each can rise in sequence; the last phrase carries the gradient. */
function HeroHeadline({ language }: { language: Language }) {
  const words = language === 'en' ? ['Small', 'tools', 'for'] : language === 'ru' ? ['Маленькие', 'инструменты,'] : ['Küçük', 'araçlar,']
  const highlight = language === 'en' ? 'big progress.' : language === 'ru' ? 'большие удобства.' : 'büyük kolaylıklar.'
  return <h1 className="hero-headline">{words.map((word, index) => <span key={word}><span className="hero-word" style={{ '--i': index } as React.CSSProperties}>{word}</span>{' '}</span>)}<span className="hero-word hero-gradient" style={{ '--i': words.length } as React.CSSProperties}>{highlight}</span></h1>
}

type CardProps = { tool: ToolDefinition; language: Language; count: number | undefined; featured: boolean; now: number; pinned: boolean; onTogglePin: (slug: string) => void }

function ToolCard({ tool, language, count, featured, now, pinned, onTogglePin }: CardProps) {
  const pick = (tr: string, en: string, ru: string) => (language === 'tr' ? tr : language === 'ru' ? ru : en)
  const { title, description } = toolCopy(tool.slug, language)
  const promotion = getActivePromotion(tool.slug, now)
  const upcoming = tool.status === 'Yakında'
  const tag = promotion ? (promotion.kind === 'new' ? pick('Yeni', 'New', 'Новое') : pick('Önerilen', 'Featured', 'Рекомендуем')) : pinned ? pick('Sabit', 'Pinned', 'Закреплено') : categoryNames[language][tool.category] ?? tool.category
  return <article className={`tool-card ${featured ? 'tool-card-featured' : 'tool-card-compact'} ${upcoming ? 'tool-card-upcoming' : ''}`} data-accent={tool.accent} data-pinned={pinned || undefined}>
    <div className="card-heading"><span className="tool-icon"><ToolIcon icon={tool.icon} /></span><h3>{upcoming ? <span className="card-link" aria-disabled="true">{title}</span> : <Link href={`/tools/${tool.slug}`} className="card-link" aria-label={`${title} — ${pick('aracı aç', 'open tool', 'открыть инструмент')}`}>{title}</Link>}</h3></div>
    <span className="card-tag">{promotion || pinned ? <Pin size={10} aria-hidden="true" /> : null}{tag}</span>
    {!upcoming && <button type="button" onClick={() => onTogglePin(tool.slug)} aria-pressed={pinned} aria-label={pinned ? pick(`${title} sabitlemesini kaldır`, `Unpin ${title}`, `Открепить ${title}`) : pick(`${title} aracını en üste sabitle`, `Pin ${title} to the top`, `Закрепить ${title} сверху`)} title={pinned ? pick('Sabitlemeyi kaldır', 'Unpin', 'Открепить') : pick('En üste sabitle', 'Pin to top', 'Закрепить сверху')} className="pin-button focus-ring">{pinned ? <PinOff size={14} /> : <Pin size={14} />}</button>}
    <p className="card-description">{description}</p>
    <div className="card-bottom"><div className="card-actions"><span className="card-arrow" aria-hidden="true"><ArrowRight size={17} /></span><span className="usage-count" title={pick('Araç açılma sayısı', 'Tool opens', 'Открытий инструмента')}><MousePointer2 size={10} aria-hidden="true" />{upcoming ? pick('Yakında', 'Soon', 'Скоро') : count === undefined ? '—' : Intl.NumberFormat(language === 'tr' ? 'tr' : language === 'ru' ? 'ru' : 'en', { notation: 'compact', maximumFractionDigits: 1 }).format(count)}</span></div><div className="card-artwork" aria-hidden="true"><ToolArtwork tool={tool} language={language} /></div></div>
  </article>
}

export function HomeClient() {
  const { language, t } = useTranslation()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ToolCategory | 'Tümü'>('Tümü')
  const [sort, setSort] = useState<ToolSort>(DEFAULT_TOOL_SORT)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [countsReady, setCountsReady] = useState(false)
  const [pinned, setPinned] = useState<string[]>([])
  const [now, setNow] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const frame = useRef<number | undefined>(undefined)

  // Pointer position drives the hero spotlight and the parallax chips through CSS variables only.
  const handleHeroMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const hero = heroRef.current
    if (!hero || event.pointerType === 'touch') return
    const rect = hero.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height
    if (frame.current) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      hero.style.setProperty('--mx', `${event.clientX.toFixed(0)}px`)
      hero.style.setProperty('--my', `${event.clientY.toFixed(0)}px`)
      hero.style.setProperty('--px', (x * 2 - 1).toFixed(3))
      hero.style.setProperty('--py', (y * 2 - 1).toFixed(3))
      hero.style.setProperty('--spot', '1')
    })
  }, [])
  const handleHeroLeave = useCallback(() => { const hero = heroRef.current; if (!hero) return; hero.style.setProperty('--spot', '0'); hero.style.setProperty('--px', '0'); hero.style.setProperty('--py', '0') }, [])

  useEffect(() => {
    setNow(Date.now())
    setPinned(readPins())
    const params = new URLSearchParams(window.location.search)
    const initialSort = params.get('sort'), initialCategory = params.get('category'), initialQuery = params.get('q')
    if (isToolSort(initialSort)) setSort(initialSort)
    if (isCategory(initialCategory)) setCategory(initialCategory)
    if (initialQuery) setQuery(initialQuery.slice(0, 80))
    setHydrated(true)
    const usageListener = (event: Event) => { const { slug, count } = (event as CustomEvent<{ slug: string; count: number }>).detail; setCounts((current) => ({ ...current, [slug]: count })) }
    const keyboardListener = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); searchRef.current?.scrollIntoView({ block: 'center' }) } }
    const storageListener = (event: StorageEvent) => { if (event.key === null || event.key === PINNED_TOOLS_STORAGE_KEY) setPinned(readPins()) }
    const controller = new AbortController()
    fetch('/api/tool-usage', { signal: controller.signal, cache: 'no-store' }).then((response) => (response.ok ? response.json() : Promise.reject(new Error('unavailable')))).then((data) => { setCounts(data.counts); setCountsReady(true) }).catch(() => {})
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    window.addEventListener(TOOL_USAGE_EVENT, usageListener)
    window.addEventListener('keydown', keyboardListener)
    window.addEventListener('storage', storageListener)
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener(TOOL_USAGE_EVENT, usageListener); window.removeEventListener('keydown', keyboardListener); window.removeEventListener('storage', storageListener) }
  }, [])

  // Filters, sort and search live in the URL so a view can be shared or restored.
  useEffect(() => {
    if (!hydrated) return
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category !== 'Tümü') params.set('category', category)
    if (sort !== DEFAULT_TOOL_SORT) params.set('sort', sort)
    const search = params.toString()
    const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(window.history.state, '', next)
  }, [query, category, sort, hydrated])

  const handleTogglePin = useCallback((slug: string) => setPinned((current) => { const next = togglePin(current, slug); writePins(next); return next }), [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language)
    const matches = tools.filter((tool) => (category === 'Tümü' || tool.category === category) && `${tool.title} ${tool.description} ${toolEnglish[tool.slug]?.title ?? ''} ${toolEnglish[tool.slug]?.description ?? ''} ${toolRussian[tool.slug]?.title ?? ''} ${toolRussian[tool.slug]?.description ?? ''} ${(tool.keywords ?? []).join(' ')}`.toLocaleLowerCase(language).includes(normalized))
    return sortTools(language === 'tr' ? matches : matches.map((tool) => ({ ...tool, title: toolCopy(tool.slug, language).title })), counts, sort, { now, language, pinned })
  }, [category, query, counts, sort, now, language, pinned])
  const filtering = category !== 'Tümü' || query.trim().length > 0
  const readyCount = tools.filter((tool) => tool.status !== 'Yakında').length
  const resetFilters = () => { setQuery(''); setCategory('Tümü') }

  return <>
    <section className="home-hero" ref={heroRef} onPointerMove={handleHeroMove} onPointerLeave={handleHeroLeave}>
      <div className="hero-spotlight" aria-hidden="true" />
      <div className="hero-orbit" aria-hidden="true">{HERO_CHIPS.map((chip, index) => <HeroChip key={index} {...chip} />)}</div>
      <div className="hero-note hero-note-left" aria-hidden="true"><span>{language === 'en' ? <>Calculate<br />Convert<br />Create<br />and more...</> : language === 'ru' ? <>Считай<br />Конвертируй<br />Создавай<br />и не только...</> : <>Hesapla<br />Dönüştür<br />Üret<br />ve daha fazlası...</>}</span><svg viewBox="0 0 70 50"><path d="M5 3Q1 37 53 36m-12-8 13 8-12 8" /></svg></div>
      <div className="hero-note hero-note-right" aria-hidden="true"><span>{language === 'en' ? <>Simple tools<br />Real results</> : language === 'ru' ? <>Простые инструменты<br />Реальные результаты</> : <>Basit araçlar<br />Gerçek sonuçlar</>}</span><svg viewBox="0 0 70 65"><path d="M44 3Q78 37 15 49m10-10-11 11 13 5" /></svg></div>
      <div className="hero-content"><div className="hero-badge animate-rise"><Sparkles size={13} aria-hidden="true" /><span>{readyCount} {t('ücretsiz araç', 'free tools', 'бесплатных инструментов')}</span><span>·</span><span>{t('Üyelik yok', 'No sign up', 'Без регистрации')}</span><span className="badge-extra">· {t('Sadece işe yarar şeyler', 'Just useful stuff', 'Только полезное')}</span></div>
        <HeroHeadline language={language} />
        <p className="hero-description animate-rise">{t('Hesaplayıcılar, dönüştürücüler ve günlük araçlar — hepsi tek yerde, tamamen ücretsiz.', 'Calculators, converters and everyday utilities — all in one place, completely free.', 'Калькуляторы, конвертеры и повседневные инструменты — всё в одном месте, полностью бесплатно.')}</p>
        <div className="hero-search animate-rise"><Search size={20} aria-hidden="true" /><input ref={searchRef} type="search" aria-label={t('Araç ara', 'Search tools', 'Поиск инструментов')} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Bir araç ara...', 'Search for a tool...', 'Найти инструмент...')} />{query ? <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus() }} aria-label={t('Aramayı temizle', 'Clear search', 'Очистить поиск')} className="focus-ring"><X size={17} /></button> : <kbd aria-hidden="true">⌘ K</kbd>}</div>
      </div>
    </section>
    <section id="categories" className="catalog-controls page-width">
      <div className="category-list" role="group" aria-label={t('Araç kategorileri', 'Tool categories', 'Категории инструментов')}>{categories.map((item) => { const Icon = toolIcons[item.icon] ?? Grid2X2; return <button key={item.label} type="button" aria-pressed={item.label === category} onClick={() => setCategory(item.label)} className="category-button focus-ring"><Icon size={15} strokeWidth={1.8} aria-hidden="true" />{categoryNames[language][item.label] ?? item.label}</button> })}</div>
      <div className="catalog-toolbar"><p aria-live="polite">{filtered.length} {t('araç', 'tools', 'инстр.')}{pinned.length > 0 && <span className="pinned-count"><Pin size={10} aria-hidden="true" />{pinned.length} {t('sabit', 'pinned', 'закреплено')}</span>}{filtering && <button className="focus-ring reset-filter" onClick={resetFilters}>{t('Filtreleri temizle', 'Clear filters', 'Сбросить фильтры')}<X size={11} aria-hidden="true" /></button>}</p><div className="sort-control"><span>{t('Sırala', 'Sort by', 'Сортировка')}</span><SelectField ariaLabel={t('Araçları sırala', 'Sort tools', 'Сортировать инструменты')} value={sort} onChange={(value) => { if (isToolSort(value)) setSort(value) }} options={[{ value: 'popular', label: t('En çok kullanılan', 'Most used', 'Самые популярные') }, { value: 'newest', label: t('En yeni', 'Newest', 'Новые') }, { value: 'name-asc', label: t('İsim (A–Z)', 'Name (A–Z)', 'Название (А–Я)') }, { value: 'name-desc', label: t('İsim (Z–A)', 'Name (Z–A)', 'Название (Я–А)') }]} /></div></div>
    </section>
    <section id="tools" className="page-width catalog-section" aria-label={t('Araçlar', 'Tools', 'Инструменты')}><div className={`tool-gallery ${filtering ? 'is-filtered' : ''}`}>{filtered.map((tool, index) => <ToolCard key={tool.slug} tool={tool} language={language} count={countsReady ? counts[tool.slug] ?? 0 : undefined} featured={filtering || index < FEATURED_COUNT} now={now} pinned={pinned.includes(tool.slug)} onTogglePin={handleTogglePin} />)}</div>{filtered.length === 0 && <div className="empty-results"><Search size={28} aria-hidden="true" /><h2>{t('Aradığın aracı bulamadık.', 'No tools found.', 'Ничего не найдено.')}</h2><p>{t('Başka bir kelime veya kategori deneyebilirsin.', 'Try a different word or category.', 'Попробуйте другое слово или категорию.')}</p><button className="focus-ring" onClick={resetFilters}>{t('Tüm araçları göster', 'Show all tools', 'Показать все инструменты')}</button></div>}</section>
    <section className="why-section page-width"><div><p className="eyebrow">{t('Neden tools.mucahid.dev?', 'Why tools.mucahid.dev?', 'Почему tools.mucahid.dev?')}</p><h2>{t('Günlük problemler için tasarlandı.', 'Built for everyday problems.', 'Создано для повседневных задач.')}</h2></div>{[{ icon: Gift, title: t('Ücretsiz', 'Free to use', 'Бесплатно'), text: t('Her zaman.', 'Always.', 'Всегда.') }, { icon: LockKeyhole, title: t('Üyelik yok', 'No sign up', 'Без регистрации'), text: t('Aç ve kullan.', 'Open and use.', 'Открыл и пользуешься.') }, { icon: Zap, title: t('Hızlı ve sade', 'Fast & simple', 'Быстро и просто'), text: t('Doğrudan sonuca ulaş.', 'Get straight to the result.', 'Сразу к результату.') }, { icon: ShieldCheck, title: t('Gizlilik öncelikli', 'Privacy first', 'Приватность прежде всего'), text: t('Girdilerin tarayıcında kalır.', 'Inputs stay in your browser.', 'Данные остаются в браузере.') }].map(({ icon: Icon, title, text }) => <div className="why-item" key={title}><span><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span><div><strong>{title}</strong><p>{text}</p></div></div>)}</section>
  </>
}
