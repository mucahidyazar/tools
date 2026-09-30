'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/hooks/use-language'
import { adsensePublisherId } from '@/lib/adsense'
import { PRIVACY_CONSENT_EVENT, readPrivacyConsent, type PrivacyConsent } from '@/lib/privacy-consent'

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? ''
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT?.trim() ?? ''
const ENABLED = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === 'true'
const VALID_CLIENT = adsensePublisherId(CLIENT) !== null
const READY = ENABLED && VALID_CLIENT && /^\d{4,20}$/.test(SLOT)
declare global { interface Window { adsbygoogle?: unknown[] } }

export function AdSlot() {
  const { t } = useTranslation()
  const ref = useRef<HTMLModElement>(null)
  const [allowed, setAllowed] = useState(false)
  const consentRef = useRef<PrivacyConsent | null>(null)
  useEffect(() => {
    const render = (consent: PrivacyConsent | null) => {
      consentRef.current = consent
      setAllowed(consent?.advertising === 'granted')
      if (consent?.advertising !== 'granted' && document.getElementById('tools-adsense-script')) { window.location.reload(); return }
      if (!READY || consent?.advertising !== 'granted' || !ref.current || ref.current.dataset.loaded) return
      const finish = () => {
        if (consentRef.current?.advertising !== 'granted' || !ref.current || ref.current.dataset.loaded) return
        ref.current.dataset.loaded = 'true'
        window.adsbygoogle = window.adsbygoogle ?? []
        window.adsbygoogle.push({})
      }
      const existing = document.getElementById('tools-adsense-script') as HTMLScriptElement | null
      if (existing) { existing.addEventListener('load', finish, { once: true }); if (window.adsbygoogle) finish(); return }
      const script = document.createElement('script')
      script.id = 'tools-adsense-script'
      script.async = true
      script.crossOrigin = 'anonymous'
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CLIENT)}`
      script.addEventListener('load', finish, { once: true })
      document.head.appendChild(script)
    }
    render(readPrivacyConsent())
    const listener = (event: Event) => render((event as CustomEvent<PrivacyConsent>).detail)
    window.addEventListener(PRIVACY_CONSENT_EVENT, listener)
    const storageListener = () => render(readPrivacyConsent())
    window.addEventListener('storage', storageListener)
    return () => {
      window.removeEventListener(PRIVACY_CONSENT_EVENT, listener)
      window.removeEventListener('storage', storageListener)
    }
  }, [allowed])
  if (!READY) {
    const subject = encodeURIComponent('tools.mucahid.dev — Reklam talebi')
    const body = encodeURIComponent('Merhaba,\n\nhttps://tools.mucahid.dev üzerinde reklam vermek istiyorum.\n\nMarka / web sitesi:\nReklam süresi:\nMesaj:\n')
    return <aside className="mx-auto mt-8 max-w-[728px] rounded-2xl border border-dashed border-[#dbe3f1] bg-[#fbfcfe] p-3 text-center" aria-label={t('Reklam', 'Advertisement', 'Реклама')}><a href={`mailto:hello@mucahid.dev?subject=${subject}&body=${body}`} className="focus-ring flex min-h-[90px] flex-col items-center justify-center gap-2 rounded-xl px-4 py-5 transition hover:bg-[#f0f4fb]"><span className="text-[.82rem] font-semibold text-[#365fbf]">{t('Buraya reklam ver', 'Advertise here', 'Разместить рекламу')}</span><span className="text-[.7rem] text-[#6d7b95]">{t('Reklam ve sponsorluk için e-posta gönder', 'Email us about advertising and sponsorship', 'Напишите нам о рекламе и спонсорстве')}</span></a></aside>
  }
  if (!allowed) return null
  return <aside className="mx-auto mt-8 max-w-[728px] rounded-2xl border border-[#edf0f5] bg-[#fbfcfe] px-3 py-3 text-center" aria-label={t('Reklam', 'Advertisement', 'Реклама')}><p className="mb-2 text-[.6rem] font-semibold uppercase tracking-[.14em] text-[#9aa5b8]">{t('Reklam', 'Advertisement', 'Реклама')}</p><ins ref={ref} className="adsbygoogle block min-h-[90px]" style={{ display: 'block' }} data-ad-client={CLIENT} data-ad-slot={SLOT} data-ad-format="auto" data-full-width-responsive="true" /></aside>
}
