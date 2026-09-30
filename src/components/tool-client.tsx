'use client'
import { ToolHistoryPanel, ToolHistoryProvider } from '@/components/tool-history'
import { ToolUsageTracker } from '@/components/tool-usage-tracker'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { ToolBody, ToolIntro } from '@/components/tool-widgets'
import type { ToolDefinition } from '@/lib/tools'

export function ToolClient({ slug, tool }: { slug: string; tool: ToolDefinition }) {
  return <div className="flex min-h-screen flex-col"><Header /><ToolUsageTracker slug={slug} /><main className="flex-1"><div className="mx-auto max-w-[1100px] px-4 py-9 sm:px-6 sm:py-12"><ToolHistoryProvider slug={slug}><ToolIntro tool={tool} /><ToolBody slug={slug} /><ToolHistoryPanel /></ToolHistoryProvider></div></main><Footer /></div>
}
