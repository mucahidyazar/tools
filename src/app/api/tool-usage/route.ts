import { NextRequest, NextResponse } from 'next/server'
import { allowUsageRequest, getToolUsageStore, isReadyToolSlug, TOOL_USAGE_COOKIE, usageSession } from '@/lib/server/tool-usage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }

export async function GET() {
  try {
    return NextResponse.json({ counts: getToolUsageStore().readCounts() }, { headers })
  } catch {
    return NextResponse.json({ error: 'Usage counts are temporarily unavailable.' }, { status: 503, headers })
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Same-origin requests are required.' }, { status: 403, headers })
  }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return NextResponse.json({ error: 'JSON is required.' }, { status: 415, headers })
  }
  if (Number(request.headers.get('content-length') ?? 0) > 1024) {
    return NextResponse.json({ error: 'Request is too large.' }, { status: 413, headers })
  }

  let payload: unknown
  try {
    const reader = request.body?.getReader()
    if (!reader) throw new Error('Missing body')
    const chunks: Uint8Array[] = []
    let bytes = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > 1024) {
        await reader.cancel()
        return NextResponse.json({ error: 'Request is too large.' }, { status: 413, headers })
      }
      chunks.push(value)
    }
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400, headers })
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid usage request.' }, { status: 400, headers })
  }
  const value = payload as Record<string, unknown>
  if (Object.keys(value).some((key) => key !== 'slug' && key !== 'visitId') || !isReadyToolSlug(value.slug) || typeof value.visitId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.visitId)) {
    return NextResponse.json({ error: 'Unknown tool or invalid visit.' }, { status: 400, headers })
  }

  const session = usageSession(request.cookies.get(TOOL_USAGE_COOKIE)?.value)
  if (!allowUsageRequest(session.hash)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: { ...headers, 'Retry-After': '60' } })
  }
  try {
    const result = getToolUsageStore().recordOpen(value.slug, value.visitId, session.hash)
    const response = NextResponse.json(result, { headers })
    if (session.fresh) response.cookies.set(TOOL_USAGE_COOKIE, session.cookie, { httpOnly: true, sameSite: 'lax', secure: new URL(request.url).protocol === 'https:', maxAge: 86400, path: '/' })
    return response
  } catch {
    return NextResponse.json({ error: 'Usage could not be recorded.' }, { status: 503, headers })
  }
}
