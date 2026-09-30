import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultPrivacyConsent, parsePrivacyConsent } from './privacy-consent'

test('privacy consent defaults to denying optional processing', () => {
  assert.deepEqual(defaultPrivacyConsent(), { analytics: 'denied', advertising: 'denied' })
})

test('privacy consent accepts only the two known choices', () => {
  assert.deepEqual(parsePrivacyConsent('{"analytics":"granted","advertising":"denied"}'), { analytics: 'granted', advertising: 'denied' })
  assert.equal(parsePrivacyConsent('{"analytics":"yes","advertising":"denied"}'), null)
  assert.equal(parsePrivacyConsent('{not json'), null)
  assert.equal(parsePrivacyConsent(null), null)
})
