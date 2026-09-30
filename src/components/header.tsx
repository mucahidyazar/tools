'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Menu, MessageSquarePlus, X } from 'lucide-react'
import { BrandLink } from '@/components/brand'
import { LanguageSelect } from '@/components/language-select'
import { useTranslation } from '@/hooks/use-language'

const SUGGEST_HREF = '/contact?topic=suggestion'
const links = [
  { href: '/', tr: 'Ana sayfa', en: 'Home', ru: 'Главная' },
  { href: '/contact', tr: 'Hakkında & İletişim', en: 'About & Contact', ru: 'О сайте и контакты' },
]

export function Header() {
  const pathname = usePathname()
  const { language, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  useEffect(() => { setOpen(false) }, [pathname])
  const suggest = t('Öneri / İstek', 'Suggest / Request', 'Предложить / Запросить')
  return (
    <header className="header-shell sticky top-0 z-50 text-[#111b35]">
      <div ref={menuRef} className="header-row relative mx-auto flex h-[4.5rem] max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <BrandLink label={t('tools.mucahid.dev ana sayfa', 'tools.mucahid.dev home', 'tools.mucahid.dev — главная')} />
        <nav aria-label={t('Ana menü', 'Main navigation', 'Главное меню')} className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
          <ul className="flex items-center gap-1.5">
            {links.map((link) => <li key={link.href}><Link href={link.href} aria-current={pathname === link.href ? 'page' : undefined} className={`focus-ring inline-flex h-11 items-center rounded-full px-3.5 text-[.82rem] font-semibold tracking-[.01em] transition ${pathname === link.href ? 'bg-[#f1f4fc] text-[#2453b8]' : 'text-[#55617a] hover:bg-[#f4f6fb] hover:text-[#172448]'}`}>{link[language]}</Link></li>)}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block"><LanguageSelect /></div>
          <Link href={SUGGEST_HREF} className="focus-ring hidden h-10 items-center gap-2 rounded-full border border-[#e3e8f2] bg-white/70 px-4 text-[.7rem] font-semibold text-[#293653] shadow-[0_2px_8px_rgba(37,61,107,.04)] transition hover:border-[#ccd6ec] hover:bg-white sm:inline-flex"><MessageSquarePlus className="size-4" strokeWidth={1.8} aria-hidden="true" />{suggest}</Link>
          <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? t('Menüyü kapat', 'Close menu', 'Закрыть меню') : t('Menüyü aç', 'Open menu', 'Открыть меню')} className="focus-ring grid size-10 shrink-0 place-items-center rounded-full text-[#33415f] transition hover:bg-[#eef2fb] lg:hidden">{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
        <nav id="mobile-navigation" hidden={!open} aria-label={t('Mobil ana menü', 'Mobile navigation', 'Мобильное меню')} className="absolute inset-x-0 top-full origin-top animate-rise border-t border-[#e8edf5] bg-white/95 px-3 pt-2 pb-3 shadow-[0_18px_28px_rgba(24,43,85,.1)] backdrop-blur-xl lg:hidden">
          <ul className="grid gap-1">{links.map((link) => <li key={link.href}><Link href={link.href} onClick={() => setOpen(false)} className="focus-ring flex h-11 items-center rounded-xl px-3.5 text-[.95rem] font-semibold text-[#45536f] hover:bg-[#f5f7fb]">{link[language]}</Link></li>)}<li><Link href={SUGGEST_HREF} onClick={() => setOpen(false)} className="focus-ring flex h-11 items-center gap-2 rounded-xl px-3.5 text-[.95rem] font-semibold text-[#45536f] hover:bg-[#f5f7fb]"><MessageSquarePlus className="size-4" aria-hidden="true" />{suggest}</Link></li><li className="px-3.5 pt-2 sm:hidden"><LanguageSelect /></li></ul>
        </nav>
      </div>
    </header>
  )
}
