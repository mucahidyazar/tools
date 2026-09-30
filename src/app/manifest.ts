import type { MetadataRoute } from 'next'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return { name: SITE_NAME, short_name: 'tools', description: SITE_DESCRIPTION.tr, start_url: '/', display: 'standalone', lang: 'tr', background_color: '#f8faff', theme_color: '#f8faff', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }, { src: '/apple-icon', sizes: '180x180', type: 'image/png' }] }
}
