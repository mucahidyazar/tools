'use client'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { useToolHistoryField } from '@/components/tool-history'

/** `name` opts the checkbox into the tool history; omit it for settings that are recorded elsewhere. */
export function Checkbox({ name, checked, onCheckedChange, label }: { name?: string; checked: boolean; onCheckedChange: (checked: boolean) => void; label: string }) {
  useToolHistoryField({ name, label, value: checked, onRestore: (value) => onCheckedChange(value === true || value === 'true') })
  return <label className="inline-flex items-center gap-2 text-[.78rem] text-[#52607b]"><CheckboxPrimitive.Root checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} className="focus-ring grid size-4 shrink-0 place-items-center rounded-[4px] border border-[#cbd5e5] bg-white data-[state=checked]:border-[#5579dd] data-[state=checked]:bg-[#5579dd]"><CheckboxPrimitive.Indicator><Check className="size-3 text-white" /></CheckboxPrimitive.Indicator></CheckboxPrimitive.Root>{label}</label>
}
