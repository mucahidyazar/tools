import assert from 'node:assert/strict'
import test from 'node:test'
import { adsensePublisherId, adsTxtRecord } from './adsense'

test('ads.txt preserves the pub- prefix required by AdSense', () => {
  assert.equal(adsensePublisherId(' ca-pub-1234567890123456 '), 'pub-1234567890123456')
  assert.equal(adsTxtRecord('ca-pub-1234567890123456'), 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n')
})

test('unconfigured or malformed publisher IDs never create an ads.txt record', () => {
  for (const value of [undefined, '', 'pub-1234567890123456', 'ca-pub-123', 'ca-pub-1234567890123456\ninjected']) {
    assert.equal(adsTxtRecord(value), null)
  }
})
