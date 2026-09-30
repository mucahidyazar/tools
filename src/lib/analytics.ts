import { readPrivacyConsent, type PrivacyConsent } from './privacy-consent'

export function parseAnalyticsConfig(gtm: string | undefined, ga: string | undefined) {
  const gtmId = /^GTM-[A-Z0-9]+$/i.test(gtm?.trim() ?? '') ? gtm!.trim() : null
  const gaId = gtmId === null && /^G-[A-Z0-9]+$/i.test(ga?.trim() ?? '') ? ga!.trim() : null
  return { gtmId, gaId }
}

export function pageParameters(pathname: string, origin: string) {
  const clean = pathname.split(/[?#]/, 1)[0] || '/'
  const pagePath = clean.startsWith('/') ? clean : `/${clean}`
  return { page_path: pagePath, page_location: `${origin}${pagePath}`, page_referrer: '' }
}

const config = parseAnalyticsConfig(process.env.NEXT_PUBLIC_GTM_ID, process.env.NEXT_PUBLIC_GA_ID)
declare global {
  interface Window {
    dataLayer?: unknown[]
    __toolsAnalytics?: { loaded: boolean; lastPath: string | null }
  }
}

function command(...args: unknown[]) {
  // Google's command queue uses an Arguments object, not a data-layer event array.
  const toArguments = function (...values: unknown[]) { void values; return arguments }
  window.dataLayer?.push(toArguments(...args))
}
function consentState(analytics: 'denied' | 'granted') {
  return { analytics_storage: analytics, ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }
}

export function applyAnalyticsConsent(consent: PrivacyConsent | null, pathname: string) {
  if (!config.gtmId && !config.gaId) return
  if (consent?.analytics !== 'granted') {
    if (window.__toolsAnalytics?.loaded) {
      command('consent', 'update', consentState('denied'))
      // Persisted withdrawal is applied on a fresh document, without the downloaded library.
      window.location.reload()
    }
    return
  }
  const parameters = pageParameters(pathname, window.location.origin)
  window.dataLayer = window.dataLayer ?? []
  if (!window.__toolsAnalytics?.loaded) {
    command('consent', 'default', consentState('denied'))
    command('consent', 'update', consentState('granted'))
    command('set', { page_location: parameters.page_location, page_referrer: '' })
    const script = document.createElement('script')
    script.async = true
    if (config.gtmId) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
      script.id = 'tools-gtm-script'
      script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.gtmId)}`
    } else {
      command('js', new Date())
      command('config', config.gaId, { send_page_view: false, page_location: parameters.page_location, page_referrer: '' })
      script.id = 'tools-ga-script'
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.gaId!)}`
    }
    document.head.appendChild(script)
    window.__toolsAnalytics = { loaded: true, lastPath: null }
  }
  const state = window.__toolsAnalytics
  if (!state || state.lastPath === parameters.page_path) return
  state.lastPath = parameters.page_path
  if (config.gtmId) window.dataLayer.push({ event: 'site_page_view', ...parameters })
  else command('event', 'page_view', parameters)
}

export function trackConsentedPage(pathname: string) {
  applyAnalyticsConsent(readPrivacyConsent(), pathname)
}
