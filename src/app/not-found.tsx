import Link from 'next/link'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'

export default function NotFound() {
  return <div className="flex min-h-screen flex-col"><Header /><main className="flex-1"><div className="mx-auto max-w-[720px] px-4 py-24 text-center sm:px-6"><p className="text-[.72rem] font-bold uppercase tracking-[.16em] text-[#7d99d7]">404</p><h1 className="mt-3 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-[-.04em] text-[#101a34]">Aradığın sayfa burada değil.</h1><p className="mt-3 text-[.95rem] text-[#6d7890]">The page you are looking for does not exist · Страница не найдена. Araç bağlantıları İngilizce adreslere taşındı; eski bağlantılar otomatik yönlendirilir.</p><Link href="/#tools" className="focus-ring mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-[#4d76df] px-6 text-[.85rem] font-bold text-white shadow-[0_7px_14px_rgba(74,115,222,.2)] hover:bg-[#3f66ca]">Tüm araçlar · All tools</Link></div></main><Footer /></div>
}
