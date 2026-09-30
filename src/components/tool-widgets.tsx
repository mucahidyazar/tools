'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { ComponentType } from 'react'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { ToolIcon } from '@/components/tool-icon'
import { Panel } from '@/components/tools/shared'
import { useLanguage } from '@/hooks/use-language'
import { toolCopy, type ToolDefinition } from '@/lib/tools'

function Loading() {
  return <Panel><div className="tool-loading" aria-busy="true" aria-label="Loading"><span /><span /><span /></div></Panel>
}
// Each tool page only downloads its own module and data.
const registry: Record<string, ComponentType> = {
  'compound-interest-calculator': dynamic(() => import('./tools/growth-tool').then((mod) => mod.CompoundInterestCalculator), { loading: Loading }),
  'investment-calculator': dynamic(() => import('./tools/growth-tool').then((mod) => mod.InvestmentCalculator), { loading: Loading }),
  'savings-calculator': dynamic(() => import('./tools/growth-tool').then((mod) => mod.SavingsCalculator), { loading: Loading }),
  'loan-calculator': dynamic(() => import('./tools/finance').then((mod) => mod.LoanTool), { loading: Loading }),
  'vat-calculator': dynamic(() => import('./tools/finance').then((mod) => mod.VatTool), { loading: Loading }),
  'percentage-calculator': dynamic(() => import('./tools/finance').then((mod) => mod.PercentageTool), { loading: Loading }),
  'historical-money-value': dynamic(() => import('./tools/inflation').then((mod) => mod.HistoricalTool), { loading: Loading }),
  'monthly-inflation-rates': dynamic(() => import('./tools/inflation').then((mod) => mod.InflationTool), { loading: Loading }),
  'roi-calculator': dynamic(() => import('./tools/inflation').then((mod) => mod.RoiTool), { loading: Loading }),
  'historical-investment-calculator': dynamic(() => import('./tools/growth-tool').then((mod) => mod.HistoricalInvestmentCalculator), { loading: Loading }),
  'leave-planner': dynamic(() => import('./tools/leave-planner-tool').then((mod) => mod.LeavePlannerTool), { loading: Loading }),
  'age-calculator': dynamic(() => import('./tools/everyday').then((mod) => mod.AgeTool), { loading: Loading }),
  'date-difference': dynamic(() => import('./tools/everyday').then((mod) => mod.DateDifferenceTool), { loading: Loading }),
  'unit-converter': dynamic(() => import('./tools/everyday').then((mod) => mod.UnitTool), { loading: Loading }),
  'bmi-calculator': dynamic(() => import('./tools/everyday').then((mod) => mod.BmiTool), { loading: Loading }),
  'calorie-calculator': dynamic(() => import('./tools/everyday').then((mod) => mod.CalorieTool), { loading: Loading }),
  'qr-code-generator': dynamic(() => import('./tools/developer').then((mod) => mod.QrTool), { loading: Loading }),
  'json-formatter': dynamic(() => import('./tools/developer').then((mod) => mod.JsonTool), { loading: Loading }),
  'password-generator': dynamic(() => import('./tools/password').then((mod) => mod.PasswordTool), { loading: Loading }),
  'mbti-personality-test': dynamic(() => import('./tools/personality-tool').then((mod) => mod.PersonalityTool), { loading: Loading }),
  'numerology-calculator': dynamic(() => import('./tools/numerology-tool').then((mod) => mod.NumerologyTool), { loading: Loading }),
  'salary-calculator': dynamic(() => import('./tools/salary-tool').then((mod) => mod.SalaryTool), { loading: Loading }),
}

export function ToolBody({ slug }: { slug: string }) {
  const language = useLanguage()
  const Tool = registry[slug]
  if (Tool) return <Tool />
  return <Panel><div className="p-8 text-center"><Sparkles className="mx-auto size-8 text-[#6685dc]" aria-hidden="true" /><p className="mt-3 font-display font-bold text-[#33415f]">{language === 'en' ? 'This tool is being prepared.' : language === 'ru' ? 'Инструмент готовится.' : 'Bu araç hazırlanıyor.'}</p></div></Panel>
}

export function ToolIntro({ tool }: { tool: ToolDefinition }) {
  const language = useLanguage()
  const copy = toolCopy(tool.slug, language)
  return <div className="mb-7 max-w-2xl"><Link href="/#tools" className="focus-ring inline-flex items-center gap-1.5 text-[.75rem] font-semibold text-[#6d7b96] hover:text-[#3159b7]"><ArrowLeft className="size-3.5" aria-hidden="true" />{language === 'en' ? 'All tools' : language === 'ru' ? 'Все инструменты' : 'Tüm araçlar'}</Link><div className="mt-5 flex items-start gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#e8edff] text-[#4c68d2]"><ToolIcon icon={tool.icon} size={28} /></span><div><h1 className="font-display text-[clamp(1.8rem,4vw,2.75rem)] font-extrabold tracking-[-.05em] text-[#101a34]">{copy.title}</h1><p className="mt-2 text-[.93rem] leading-relaxed text-[#6d7890]">{copy.description}</p></div></div></div>
}
