import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ToolClient } from '@/components/tool-client'
import { absoluteUrl, jsonLd, SITE_AUTHOR, SITE_NAME } from '@/lib/site'
import { TOOL_RELEASE_DATES } from '@/lib/tool-promotions'
import { getTool, toolEnglish, tools } from '@/lib/tools'

type Params = { params: Promise<{ slug: string }> }

export function generateStaticParams() { return tools.map((tool) => ({ slug: tool.slug })) }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const tool = getTool(slug)
  if (!tool) return {}
  const english = toolEnglish[slug]
  const description = english ? `${tool.description} ${english.description}` : tool.description
  return {
    title: english ? `${tool.title} · ${english.title}` : tool.title,
    description,
    keywords: [tool.title, english?.title ?? '', tool.category, ...(tool.keywords ?? [])].filter(Boolean),
    alternates: { canonical: `/tools/${slug}` },
    openGraph: { title: `${tool.title} — ${SITE_NAME}`, description: tool.description, url: `/tools/${slug}`, type: 'website', locale: 'tr_TR', siteName: SITE_NAME },
    twitter: { card: 'summary_large_image', title: `${tool.title} — ${SITE_NAME}`, description: tool.description },
    robots: tool.status === 'Yakında' ? { index: false, follow: true } : undefined,
  }
}

export default async function ToolPage({ params }: Params) {
  const { slug } = await params
  const tool = getTool(slug)
  if (!tool) notFound()
  const english = toolEnglish[slug]
  const structuredData = [
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: tool.title, alternateName: english?.title, description: tool.description, url: absoluteUrl(`/tools/${slug}`), applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web', browserRequirements: 'Requires JavaScript', inLanguage: ['tr', 'en'], isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'TRY' }, datePublished: TOOL_RELEASE_DATES[slug], author: { '@type': 'Person', name: SITE_AUTHOR.name, url: SITE_AUTHOR.url }, publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Araçlar', item: absoluteUrl('/') }, { '@type': 'ListItem', position: 2, name: tool.title, item: absoluteUrl(`/tools/${slug}`) }] },
  ]
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} /><ToolClient slug={slug} tool={tool} /></>
}
