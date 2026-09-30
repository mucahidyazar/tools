import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { NextRequest } from 'next/server'
import { GET, POST } from '../app/api/tool-usage/route'
import { getToolUsageStore } from './server/tool-usage'

const origin = 'https://tools.mucahid.dev'
function request(body: unknown, extraHeaders: Record<string, string> = {}) {
  return new NextRequest(`${origin}/api/tool-usage`, {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  })
}

test('usage origin validation uses the public site origin behind an HTTP tunnel', async () => {
  const previousOrigin = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_SITE_URL = origin
  try {
    const proxied = (extraHeaders: Record<string, string> = {}) => new NextRequest('http://localhost:3000/api/tool-usage', {
      method: 'POST',
      headers: { origin, 'Content-Type': 'application/json', ...extraHeaders },
      // Invalid input stops before storage; a 400 means the origin check accepted it.
      body: JSON.stringify({ slug: 'not-a-tool', visitId: randomUUID() }),
    })
    assert.equal((await POST(proxied())).status, 400)
    assert.equal((await POST(proxied({ origin: 'https://other.example' }))).status, 403)
    assert.equal((await POST(proxied({ 'sec-fetch-site': 'cross-site' }))).status, 403)
    assert.equal((await POST(proxied({ origin: 'null' }))).status, 403)
    assert.equal((await POST(proxied({ origin: 'http://localhost:3000' }))).status, 403)
  } finally {
    if (previousOrigin === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = previousOrigin
  }
})

test('usage API accepts only same-origin ready-tool increments and returns persistent totals', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'tools-usage-api-test-'))
  const previousDirectory = process.env.TOOLS_DATA_DIR
  process.env.TOOLS_DATA_DIR = directory
  try {
    assert.equal((await POST(request({ slug: 'qr-code-generator', visitId: randomUUID() }, { origin: 'https://other.example' }))).status, 403)
    assert.equal((await POST(request({ slug: 'qr-code-generator', visitId: randomUUID() }, { 'Content-Type': 'text/plain' }))).status, 415)
    assert.equal((await POST(request({ slug: 'qr-code-generator', visitId: randomUUID() }, { 'Content-Length': '1025' }))).status, 413)
    assert.equal((await POST(request({ slug: 'qr-code-generator', visitId: randomUUID(), total: 999999 }))).status, 400)
    assert.equal((await POST(request({ slug: 'home-cost-calculator', visitId: randomUUID() }))).status, 400)
    assert.equal((await POST(request({ slug: 'qr-code-generator', visitId: 'invalid' }))).status, 400)
    assert.equal((await POST(request({ slug: 'qr-code-generator', visitId: randomUUID(), padding: 'x'.repeat(1100) }))).status, 413)

    const visitId = randomUUID()
    const first = await POST(request({ slug: 'qr-code-generator', visitId }))
    assert.equal(first.status, 200)
    assert.deepEqual(await first.json(), { slug: 'qr-code-generator', count: 1, counted: true })
    assert.match(first.headers.get('set-cookie') ?? '', /HttpOnly/)
    const cookie = first.headers.get('set-cookie')!.split(';')[0]
    const duplicate = await POST(request({ slug: 'qr-code-generator', visitId }, { cookie }))
    assert.deepEqual(await duplicate.json(), { slug: 'qr-code-generator', count: 1, counted: false })
    const rapid = await POST(request({ slug: 'qr-code-generator', visitId: randomUUID() }, { cookie }))
    assert.deepEqual(await rapid.json(), { slug: 'qr-code-generator', count: 1, counted: false })
    const counts = await GET()
    assert.equal(counts.headers.get('cache-control'), 'no-store')
    assert.equal((await counts.json()).counts['qr-code-generator'], 1)
  } finally {
    getToolUsageStore().close()
    if (previousDirectory === undefined) delete process.env.TOOLS_DATA_DIR
    else process.env.TOOLS_DATA_DIR = previousDirectory
    rmSync(directory, { recursive: true, force: true })
  }
})
