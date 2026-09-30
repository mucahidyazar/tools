import type { Metadata } from 'next'
import { ContactClient } from '@/components/contact-client'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { absoluteUrl, jsonLd, SITE_AUTHOR, SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Hakkında & İletişim · About & Contact',
  description: 'tools.mucahid.dev hakkında bilgi, gizlilik yaklaşımı, veri kaynakları ve iletişim formu. Araç önerisi, istek ve hata bildirimi için yazın.',
  alternates: { canonical: '/contact' },
  openGraph: { title: `Hakkında & İletişim — ${SITE_NAME}`, description: 'Araç önerisi, istek ve hata bildirimi için iletişim formu.', url: '/contact', type: 'website', locale: 'tr_TR', siteName: SITE_NAME },
}

export default function ContactPage() {
  const structuredData = [
    { '@context': 'https://schema.org', '@type': 'ContactPage', name: 'Hakkında & İletişim', url: absoluteUrl('/contact'), mainEntity: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/'), email: 'hello@mucahid.dev', founder: { '@type': 'Person', name: SITE_AUTHOR.name, url: SITE_AUTHOR.url } } },
  ]
  return <div className="flex min-h-screen flex-col"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} /><Header /><main className="flex-1"><div className="mx-auto max-w-[1100px] px-4 py-9 sm:px-6 sm:py-12"><ContactClient /></div></main><Footer /></div>
}
