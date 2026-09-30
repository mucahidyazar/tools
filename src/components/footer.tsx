'use client'

import Link from 'next/link'
import { useCallback, useRef } from 'react'
import { ArrowUpRight, Github } from 'lucide-react'
import { BrandLink } from '@/components/brand'
import { FooterScene } from '@/components/footer-scene'
import { LanguageSelect } from '@/components/language-select'
import { useTranslation } from '@/hooks/use-language'

export function Footer() {
  const { language, t } = useTranslation()
  const english = language === 'en'
  const ref = useRef<HTMLElement>(null)
  const frame = useRef<number | undefined>(undefined)
  // The illustration reads these variables; nothing re-renders while the pointer moves.
  const handleMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const footer = ref.current
    if (!footer || event.pointerType === 'touch') return
    const rect = footer.getBoundingClientRect()
    const scene = footer.querySelector<HTMLElement>('[data-scene]')?.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height
    const sceneX = scene ? Math.min(1, Math.max(0, (event.clientX - scene.left) / scene.width)) : x
    const sceneY = scene ? Math.min(1, Math.max(0.08, (event.clientY - scene.top) / scene.height)) : y
    if (frame.current) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      footer.style.setProperty('--px', (x * 2 - 1).toFixed(3))
      footer.style.setProperty('--py', (y * 2 - 1).toFixed(3))
      footer.style.setProperty('--cx', sceneX.toFixed(4))
      footer.style.setProperty('--cy', sceneY.toFixed(4))
      footer.style.setProperty('--active', '1')
    })
  }, [])
  const handleLeave = useCallback(() => { const footer = ref.current; if (!footer) return; footer.style.setProperty('--active', '0'); footer.style.setProperty('--px', '0'); footer.style.setProperty('--py', '0') }, [])
  return <footer ref={ref} onPointerMove={handleMove} onPointerLeave={handleLeave} className="site-footer mt-auto text-[#15203b]" id="about">
    <div className="relative z-[1] mx-auto max-w-[1440px] px-4 pt-12 pb-9 sm:px-6 lg:px-8">
      <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="sm:col-span-2 lg:col-span-1"><BrandLink size="sm" label={t('tools.mucahid.dev ana sayfa', 'tools.mucahid.dev home', 'tools.mucahid.dev — главная')} /><p className="mt-3 max-w-[38ch] text-[.87rem] leading-relaxed text-[#768199]">{t('Günlük işlerinizi kolaylaştıran küçük, hızlı ve ücretsiz araçlar. Girdileriniz tarayıcınızdan çıkmaz.', 'Small, fast and free tools for everyday tasks. Your inputs never leave your browser.', 'Небольшие, быстрые и бесплатные инструменты на каждый день. Ваши данные не покидают браузер.')}</p><p className="mt-4 text-[.76rem] text-[#98a1b3]">© {new Date().getFullYear()} tools.mucahid.dev</p><div className="mt-4"><LanguageSelect size="sm" /></div></div>
        <nav aria-label={t('Araç kategorileri', 'Tool categories', 'Категории инструментов')}><h2 className="text-[.66rem] font-bold tracking-[.16em] text-[#8993a8] uppercase">{t('Kategoriler', 'Categories', 'Категории')}</h2><ul className="mt-3 grid gap-2 text-[.84rem] text-[#64708a]"><li><Link href="/?category=Finans#tools" className="hover:text-[#2d55b7]">{t('Finans', 'Finance', 'Финансы')}</Link></li><li><Link href="/?category=D%C3%B6n%C3%BC%C5%9Ft%C3%BCr%C3%BCc%C3%BCler#tools" className="hover:text-[#2d55b7]">{t('Dönüştürücüler', 'Converters', 'Конвертеры')}</Link></li><li><Link href="/?category=G%C3%BCnl%C3%BCk#tools" className="hover:text-[#2d55b7]">{t('Günlük araçlar', 'Everyday tools', 'Повседневные')}</Link></li><li><Link href="/?category=Geli%C5%9Ftirici#tools" className="hover:text-[#2d55b7]">{t('Geliştirici araçları', 'Developer tools', 'Для разработчиков')}</Link></li></ul></nav>
        <nav aria-label={t('Bağlantılar', 'Links', 'Ссылки')}><h2 className="text-[.66rem] font-bold tracking-[.16em] text-[#8993a8] uppercase">{t('Bağlantılar', 'Links', 'Ссылки')}</h2><ul className="mt-3 grid gap-2 text-[.84rem] text-[#64708a]"><li><Link href="/contact" className="hover:text-[#2d55b7]">{t('Hakkında', 'About', 'О сайте')}</Link></li><li><Link href="/privacy" className="hover:text-[#2d55b7]">{t('Gizlilik', 'Privacy', 'Конфиденциальность')}</Link></li><li><Link href="/contact#contact-form" className="hover:text-[#2d55b7]">{t('İletişim formu', 'Contact form', 'Форма обратной связи')}</Link></li><li><a href="mailto:hello@mucahid.dev" className="inline-flex items-center gap-1.5 hover:text-[#2d55b7]">hello@mucahid.dev <ArrowUpRight className="size-3.5" aria-hidden="true" /></a></li><li><a href="https://github.com/mucahidyazar/tools" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-[#2d55b7]"><Github className="size-3.5" aria-hidden="true" /> GitHub</a></li></ul></nav>
      </div>
    </div>
    <FooterScene />
    <div className="relative z-[1] border-t border-[#e6ecf7] bg-[#f3f7ff]"><div className="mx-auto flex max-w-[1440px] justify-center px-4 py-4 sm:px-6 lg:px-8"><p className="flex flex-wrap items-center justify-center gap-x-1.5 text-[.8rem] text-[#8a94a8]">Made with <span role="img" aria-label="love">💜</span> by <a href="https://mucahid.dev" target="_blank" rel="noreferrer" className="font-semibold text-[#3f4c68] underline-offset-4 hover:underline">mucahid.dev</a> for <Link href="/" className="font-semibold text-[#3f4c68] underline-offset-4 hover:underline">tools.mucahid.dev</Link></p></div></div>
  </footer>
}
