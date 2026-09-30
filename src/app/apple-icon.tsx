import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8faff, #eef2ff)', borderRadius: 40 }}>
      <svg width="132" height="132" viewBox="0 0 40 40"><path d="M20 2.5 36 11v18L20 37.5 4 29V11L20 2.5Z" fill="white" stroke="#5b4fe6" strokeWidth="3" /><path d="m20 2.5 16 8.6-16 9-16-9 16-8.6Z" fill="#e8edff" stroke="#1b2a67" strokeWidth="2" /><path d="M20 20.1v17.1M4.5 11.2 20 20.1l15.5-8.9" fill="none" stroke="#1b2a67" strokeWidth="2" /></svg>
    </div>,
    size,
  )
}
