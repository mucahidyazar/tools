'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { applyAnalyticsConsent, trackConsentedPage } from '@/lib/analytics'
import { PRIVACY_CONSENT_EVENT, readPrivacyConsent, type PrivacyConsent } from '@/lib/privacy-consent'

export function Analytics() {
  const pathname = usePathname()
  useEffect(() => {
    trackConsentedPage(pathname)
    const listener = (event: Event) => applyAnalyticsConsent((event as CustomEvent<PrivacyConsent>).detail ?? readPrivacyConsent(), pathname)
    const storageListener = () => trackConsentedPage(pathname)
    window.addEventListener(PRIVACY_CONSENT_EVENT, listener)
    window.addEventListener('storage', storageListener)
    return () => {
      window.removeEventListener(PRIVACY_CONSENT_EVENT, listener)
      window.removeEventListener('storage', storageListener)
    }
  }, [pathname])
  return null
}
