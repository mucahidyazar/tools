'use client'
import { useToolHistoryField } from '@/components/tool-history'

/** An on/off toggle with its label inside the control so the whole row is clickable. */
export function Switch({ name, label, description, checked, onCheckedChange }: { name?: string; label: string; description?: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  useToolHistoryField({ name, label, value: checked, onRestore: (value) => onCheckedChange(value === true || value === 'true') })
  return <button type="button" role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} className={`switch focus-ring ${checked ? 'is-on' : ''}`}>
    <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
    <span className="switch-text"><span className="switch-label">{label}</span>{description && <span className="switch-description">{description}</span>}</span>
  </button>
}
