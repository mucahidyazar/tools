/** Site-wide constants shared by metadata, sitemap and structured data. */
export const SITE_NAME = 'tools.mucahid.dev'
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tools.mucahid.dev').replace(/\/$/, '')
export const SITE_AUTHOR = { name: 'Mücahid', url: 'https://mucahid.dev' }
export const SITE_DESCRIPTION = { tr: 'Günlük yaşam, finans, geliştirici ve hızlı hesaplama araçları. Ücretsiz, hızlı ve üyelik gerektirmez.', en: 'Everyday, finance, developer and quick calculation tools. Free, fast and no sign-up.' }
export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`

/** Serialises JSON-LD safely inside a script tag. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
