import Link from 'next/link'

/** The cube mark used everywhere the brand appears: header, footer, icons and social images. */
export function ToolsMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs><linearGradient id="tools-mark-gradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#4f46e5" /><stop offset="1" stopColor="#714be8" /></linearGradient></defs>
      <path d="M20 2.5 36 11v18L20 37.5 4 29V11L20 2.5Z" fill="white" stroke="url(#tools-mark-gradient)" strokeWidth="3" />
      <path d="m20 2.5 16 8.6-16 9-16-9 16-8.6Z" fill="#e8edff" stroke="#1b2a67" strokeWidth="2" />
      <path d="M20 20.1v17.1M4.5 11.2 20 20.1l15.5-8.9" fill="none" stroke="#1b2a67" strokeWidth="2" />
    </svg>
  )
}

/** Wordmark next to the cube. `tools` and `.mucahid.dev` are one word with no gap between them. */
export function Brand({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const text = size === 'sm' ? 'text-[1rem]' : 'brand-text text-[1.06rem] sm:text-[1.18rem]'
  return <span className="flex items-center gap-2.5"><ToolsMark className={size === 'sm' ? 'size-7' : 'size-8'} /><span className={`font-display font-extrabold tracking-[-0.025em] whitespace-nowrap ${text}`}>tools<span className="font-semibold text-[#635ee8]">.mucahid.dev</span></span></span>
}

export function BrandLink({ size = 'md', label }: { size?: 'sm' | 'md'; label: string }) {
  return <Link href="/" aria-label={label} className="focus-ring inline-block rounded-lg"><Brand size={size} /></Link>
}
