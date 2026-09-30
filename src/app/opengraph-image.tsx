import { OG_SIZE, renderOgImage } from '@/lib/server/og-image'

export const runtime = 'nodejs'
export const alt = 'tools.mucahid.dev — Basit araçlar, gerçek sonuçlar'
export const size = OG_SIZE
export const contentType = 'image/png'

export default function Image() {
  return renderOgImage({ title: 'Küçük araçlar, büyük kolaylıklar.', subtitle: 'Hesaplayıcılar, dönüştürücüler ve günlük araçlar — hepsi tek yerde, tamamen ücretsiz.', tag: 'Ücretsiz araçlar' })
}
