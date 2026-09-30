'use client'

import { useEffect, useState } from 'react'
import { Settings, ShieldCheck, X } from 'lucide-react'
import { useTranslation } from '@/hooks/use-language'
import { defaultPrivacyConsent, PRIVACY_CONSENT_EVENT, readPrivacyConsent, savePrivacyConsent, type PrivacyConsent } from '@/lib/privacy-consent'

function choice(checked: boolean): 'granted' | 'denied' {
  return checked ? 'granted' : 'denied'
}

export function PrivacyConsent() {
  const { t } = useTranslation()
  const [consent, setConsent] = useState<PrivacyConsent | null>(null)
  const [open, setOpen] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [advertising, setAdvertising] = useState(false)

  useEffect(() => {
    const existing = readPrivacyConsent()
    if (existing) {
      setConsent(existing)
      setAnalytics(existing.analytics === 'granted')
      setAdvertising(existing.advertising === 'granted')
    }
    const listener = (event: Event) => {
      const next = (event as CustomEvent<PrivacyConsent>).detail
      setConsent(next)
      setAnalytics(next.analytics === 'granted')
      setAdvertising(next.advertising === 'granted')
    }
    window.addEventListener(PRIVACY_CONSENT_EVENT, listener)
    return () => window.removeEventListener(PRIVACY_CONSENT_EVENT, listener)
  }, [])

  const persist = (next: PrivacyConsent) => {
    savePrivacyConsent(next)
    setConsent(next)
    setOpen(false)
  }

  const resetToDefaults = () => {
    const next = defaultPrivacyConsent()
    setAnalytics(false)
    setAdvertising(false)
    persist(next)
  }

  const settings = consent !== null
  return <>
    {(!settings || open) && <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-[#dbe4f4] bg-white/95 p-4 shadow-[0_16px_50px_rgba(42,61,113,.2)] backdrop-blur" role="dialog" aria-modal="false" aria-labelledby="privacy-consent-title">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#4d6fce]"><ShieldCheck className="size-4.5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3"><h2 id="privacy-consent-title" className="text-[.82rem] font-bold text-[#24365e]">{t('Gizlilik ve izinler', 'Privacy and consent', 'Конфиденциальность и согласие')}</h2>{settings && <button type="button" onClick={() => setOpen(false)} className="focus-ring rounded-md p-1 text-[#7f8ca3]" aria-label={t('Ayarları kapat', 'Close settings', 'Закрыть настройки')}><X className="size-4" /></button>}</div>
          <p className="mt-1 text-[.72rem] leading-relaxed text-[#6b7892]">{t('İsteğe bağlı analiz ve reklam scriptleri yalnızca seçtiğin izinlerden sonra yüklenir. Araç girdileri gönderilmez.', 'Optional analytics and advertising scripts load only after your choice. Tool inputs are never sent.', 'Необязательные аналитические и рекламные скрипты загружаются только после выбора. Введённые данные инструментов не отправляются.')}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#e5eaf3] p-2.5"><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} className="mt-0.5 size-4 accent-[#4d76df]" /><span><span className="block text-[.72rem] font-bold text-[#3a4a6d]">{t('Analiz', 'Analytics', 'Аналитика')}</span><span className="block text-[.65rem] leading-relaxed text-[#8793a9]">{t('Google Analytics ile sayfa yolu ölçümü; çerezler kullanılabilir.', 'Path-only Google Analytics; cookies may be used.', 'Google Analytics: путь страницы; возможно использование cookies.')}</span></span></label>
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#e5eaf3] p-2.5"><input type="checkbox" checked={advertising} onChange={(event) => setAdvertising(event.target.checked)} className="mt-0.5 size-4 accent-[#4d76df]" /><span><span className="block text-[.72rem] font-bold text-[#3a4a6d]">{t('Reklamlar', 'Advertising', 'Реклама')}</span><span className="block text-[.65rem] leading-relaxed text-[#8793a9]">{t('Sayfada açıkça etiketlenmiş reklam alanları.', 'Clearly labelled ad spaces on the page.', 'Явно обозначенные рекламные места.')}</span></span></label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => persist({ analytics: choice(analytics), advertising: choice(advertising) })} className="focus-ring inline-flex h-9 items-center justify-center rounded-lg bg-[#4d76df] px-3.5 text-[.7rem] font-bold text-white hover:bg-[#3f66ca]">{t('Seçimleri kaydet', 'Save choices', 'Сохранить выбор')}</button>{!settings && <><button type="button" onClick={() => persist({ analytics: 'granted', advertising: 'granted' })} className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-[#dce5f4] px-3.5 text-[.7rem] font-semibold text-[#4d6491] hover:bg-[#f5f7fc]">{t('Tümüne izin ver', 'Allow all', 'Разрешить всё')}</button><button type="button" onClick={resetToDefaults} className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-[#dce5f4] px-3.5 text-[.7rem] font-semibold text-[#4d6491] hover:bg-[#f5f7fc]">{t('Sadece gerekli', 'Necessary only', 'Только необходимые')}</button></>}</div>
        </div>
      </div>
    </div>}
    {settings && !open && <button type="button" onClick={() => setOpen(true)} className="fixed bottom-3 left-3 z-40 inline-flex h-9 items-center gap-1.5 rounded-full border border-[#dce5f4] bg-white/95 px-3 text-[.68rem] font-semibold text-[#647495] shadow-sm backdrop-blur hover:text-[#3159b7]"><Settings className="size-3.5" aria-hidden="true" />{t('Gizlilik ayarları', 'Privacy settings', 'Настройки конфиденциальности')}</button>}
  </>
}
