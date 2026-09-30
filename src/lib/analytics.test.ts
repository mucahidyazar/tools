import assert from 'node:assert/strict'
import test from 'node:test'
import { pageParameters, parseAnalyticsConfig } from './analytics'

test('GTM takes priority over direct GA and malformed IDs never load', () => {
  assert.deepEqual(parseAnalyticsConfig(' GTM-ABC123 ', 'G-XYZ123'), { gtmId: 'GTM-ABC123', gaId: null })
  assert.deepEqual(parseAnalyticsConfig(undefined, 'G-XYZ123'), { gtmId: null, gaId: 'G-XYZ123' })
  assert.deepEqual(parseAnalyticsConfig('https://evil.example', '<script>'), { gtmId: null, gaId: null })
})

test('analytics never includes queries, fragments or the document referrer', () => {
  assert.deepEqual(pageParameters('/contact?email=private@example.com#token', 'https://tools.mucahid.dev'), {
    page_path: '/contact', page_location: 'https://tools.mucahid.dev/contact', page_referrer: '',
  })
  assert.equal(pageParameters('', 'https://tools.mucahid.dev').page_path, '/')
})
