import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { HomeClient } from '@/components/home-client'
import { absoluteUrl, jsonLd, SITE_AUTHOR, SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'
import { toolEnglish, tools } from '@/lib/tools'

export default function HomePage() {
  const ready = tools.filter((tool) => tool.status !== 'Yakında')
  const structuredData = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/'), description: SITE_DESCRIPTION.tr, inLanguage: ['tr', 'en'], author: { '@type': 'Person', name: SITE_AUTHOR.name, url: SITE_AUTHOR.url }, potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${absoluteUrl('/')}?q={search_term_string}` }, 'query-input': 'required name=search_term_string' } },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Araçlar', numberOfItems: ready.length, itemListElement: ready.map((tool, index) => ({ '@type': 'ListItem', position: index + 1, url: absoluteUrl(`/tools/${tool.slug}`), name: tool.title, description: tool.description, alternateName: toolEnglish[tool.slug]?.title })) },
  ]
  return <div className="flex min-h-screen flex-col"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} /><Header /><main className="flex-1"><HomeClient /></main><Footer /></div>
}
