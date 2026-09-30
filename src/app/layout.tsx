import type { Metadata, Viewport } from 'next'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Basit araçlar, gerçek sonuçlar`, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION.tr,
  applicationName: SITE_NAME,
  keywords: ['hesaplama araçları', 'faiz hesaplama', 'kredi hesaplama', 'KDV hesaplama', 'brüt net maaş', 'enflasyon hesaplama', 'birim dönüştürücü', 'şifre oluşturucu', 'ücretsiz araçlar', 'free online calculators'],
  alternates: { canonical: '/' },
  openGraph: { title: `${SITE_NAME} — Basit araçlar, gerçek sonuçlar`, description: SITE_DESCRIPTION.tr, type: 'website', url: '/', locale: 'tr_TR', siteName: SITE_NAME },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESCRIPTION.tr },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = { themeColor: '#f8faff', width: 'device-width', initialScale: 1 }

/** Restores the remembered UI language before paint; the server always renders Turkish first. */
const languageBootstrap = "try{var l=localStorage.getItem('tools:language');if(l==='en'||l==='tr'||l==='ru'){document.documentElement.lang=l}}catch(e){}"

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: languageBootstrap }} /></head><body><div className="ambient-background" aria-hidden="true"><span/><span/><span/><i/><i/><i/></div>{children}</body></html>
}
