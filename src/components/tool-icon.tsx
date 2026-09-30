import { ArrowRightLeft, BarChart3, CalendarDays, Calculator, Code2, Coins, FileText, Flame, Grid2X2, HeartPulse, Home, LockKeyhole, Luggage, Percent, PiggyBank, QrCode, Repeat2, Sparkles, TrendingUp, WalletCards, type LucideIcon } from 'lucide-react'

export const toolIcons: Record<string, LucideIcon> = { percent: Percent, home: Home, coins: Coins, repeat: Repeat2, calculator: Calculator, file: FileText, qr: QrCode, sparkles: Sparkles, calendar: CalendarDays, trending: TrendingUp, wallet: WalletCards, heart: HeartPulse, flame: Flame, lock: LockKeyhole, code: Code2, chart: BarChart3, grid: Grid2X2, arrow: ArrowRightLeft, piggy: PiggyBank, luggage: Luggage }

export function ToolIcon({ icon, size = 27, strokeWidth = 1.8, className }: { icon: string; size?: number; strokeWidth?: number; className?: string }) {
  const Icon = toolIcons[icon] ?? Sparkles
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />
}
