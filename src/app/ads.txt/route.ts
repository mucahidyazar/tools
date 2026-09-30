import { adsTxtRecord } from '@/lib/adsense'

export function GET() {
  const record = adsTxtRecord(process.env.NEXT_PUBLIC_ADSENSE_CLIENT)
  if (!record) return new Response(null, { status: 404 })
  return new Response(record, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}
