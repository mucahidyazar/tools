import { ImageResponse } from 'next/og'

export const OG_SIZE = { width: 1200, height: 630 }
const runtime = globalThis as typeof globalThis & { toolsOgFont?: Promise<ArrayBuffer | null> }

/** Loads Manrope once per server process so Turkish characters render; falls back to the built-in font. */
function loadFont() {
  runtime.toolsOgFont ??= (async () => {
    try {
      const css = await fetch('https://fonts.googleapis.com/css2?family=Manrope:wght@800', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0' } }).then((response) => response.text())
      const url = /url\((https:[^)]+\.ttf)\)/.exec(css)?.[1]
      return url ? await fetch(url).then((response) => response.arrayBuffer()) : null
    } catch {
      return null
    }
  })()
  return runtime.toolsOgFont
}

export async function renderOgImage({ title, subtitle, tag }: { title: string; subtitle: string; tag: string }) {
  const font = await loadFont()
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, background: 'linear-gradient(135deg, #f8faff 0%, #eef2ff 55%, #f5efff 100%)', color: '#101a34', fontFamily: 'Manrope, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, fontWeight: 800 }}>
        <svg width="56" height="56" viewBox="0 0 40 40"><path d="M20 2.5 36 11v18L20 37.5 4 29V11L20 2.5Z" fill="white" stroke="#5b4fe6" strokeWidth="3" /><path d="m20 2.5 16 8.6-16 9-16-9 16-8.6Z" fill="#e8edff" stroke="#1b2a67" strokeWidth="2" /><path d="M20 20.1v17.1M4.5 11.2 20 20.1l15.5-8.9" fill="none" stroke="#1b2a67" strokeWidth="2" /></svg>
        <span>tools<span style={{ color: '#635ee8' }}>.mucahid.dev</span></span>
        <span style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 700, color: '#315bc3', background: '#ffffffc0', padding: '10px 20px', borderRadius: 999 }}>{tag}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ fontSize: title.length > 26 ? 66 : 84, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05 }}>{title}</div>
        <div style={{ fontSize: 30, color: '#5b6784', lineHeight: 1.35, maxWidth: 1000 }}>{subtitle}</div>
      </div>
      <div style={{ display: 'flex', fontSize: 22, color: '#7a8699' }}>Ücretsiz · Üyelik yok · Girdilerin tarayıcında kalır</div>
    </div>,
    { ...OG_SIZE, fonts: font ? [{ name: 'Manrope', data: font, weight: 800, style: 'normal' }] : undefined },
  )
}
