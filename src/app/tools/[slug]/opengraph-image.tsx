import { OG_SIZE, renderOgImage } from '@/lib/server/og-image'
import { getTool, tools } from '@/lib/tools'

export const runtime = 'nodejs'
export const size = OG_SIZE
export const contentType = 'image/png'
export function generateStaticParams() { return tools.map((tool) => ({ slug: tool.slug })) }

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tool = getTool(slug)
  return renderOgImage({ title: tool?.title ?? 'tools.mucahid.dev', subtitle: tool?.description ?? '', tag: tool?.category ?? 'Araç' })
}
