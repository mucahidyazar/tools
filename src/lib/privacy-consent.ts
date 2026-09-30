export const PRIVACY_CONSENT_STORAGE_KEY = 'tools:privacy-consent'
export const PRIVACY_CONSENT_EVENT = 'tools:privacy-consent-change'

export type ConsentChoice = 'granted' | 'denied'
export type PrivacyConsent = {
  analytics: ConsentChoice
  advertising: ConsentChoice
}

export const defaultPrivacyConsent = (): PrivacyConsent => ({ analytics: 'denied', advertising: 'denied' })
let memoryConsent: PrivacyConsent | null = null

export function parsePrivacyConsent(value: string | null | undefined): PrivacyConsent | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<PrivacyConsent>
    if (!isChoice(parsed.analytics) || !isChoice(parsed.advertising)) return null
    return { analytics: parsed.analytics, advertising: parsed.advertising }
  } catch {
    return null
  }
}

export function isChoice(value: unknown): value is ConsentChoice {
  return value === 'granted' || value === 'denied'
}

export function readPrivacyConsent(): PrivacyConsent | null {
  if (typeof window === 'undefined') return null
  try { return parsePrivacyConsent(window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY)) } catch { return memoryConsent }
}

export function savePrivacyConsent(consent: PrivacyConsent) {
  if (typeof window === 'undefined') return
  memoryConsent = consent
  try { window.localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(consent)) } catch { /* Storage is optional. */ }
  window.dispatchEvent(new CustomEvent<PrivacyConsent>(PRIVACY_CONSENT_EVENT, { detail: consent }))
}
