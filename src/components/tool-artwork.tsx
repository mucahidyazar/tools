import { useId } from 'react'
import { ArrowRight, ArrowRightLeft, CalendarDays, Fingerprint, Flame, Heart, KeyRound, PiggyBank, Scale, Wallet } from 'lucide-react'
import type { Language } from '@/lib/format'
import type { ToolDefinition } from '@/lib/tools'

/** Small illustrations occupy their own layout cell, never the text column. */
export function ToolArtwork({ tool, language }: { tool: ToolDefinition; language: Language }) {
  const id = useId().replaceAll(':', '')
  const en = language !== 'tr'
  const ru = language === 'ru'
  switch (tool.slug) {
    case 'home-cost-calculator': return <img src="/images/house-cost.png" alt="" className="house-art" width="200" height="132" loading="lazy" decoding="async" />
    case 'investment-calculator':
    case 'roi-calculator': return <svg viewBox="0 0 200 110" className="growth-art" aria-hidden="true"><defs><linearGradient id={id} x1="0" x2="1"><stop stopColor="#8edbb1" /><stop offset="1" stopColor="#26a466" /></linearGradient></defs>{[22, 35, 52, 75, 99].map((height, i) => <rect key={height} x={8 + i * 38} y={110 - height} width="28" height={height} rx="5" fill={`url(#${id})`} opacity={.42 + i * .14} />)}<path d="M14 67C63 60 105 42 143 17" fill="none" stroke="#2aac6b" strokeWidth="3" strokeLinecap="round" /><path d="m135 17 9-1-2 9" fill="none" stroke="#2aac6b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'historical-money-value':
    case 'monthly-inflation-rates':
    case 'historical-investment-calculator': return <svg viewBox="0 0 200 110" aria-hidden="true"><defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#f9c54c" stopOpacity=".22" /><stop offset="1" stopColor="#f9c54c" stopOpacity=".04" /></linearGradient></defs><path d="M4 96 25 79 46 85 67 68 87 57 111 67 137 34 159 39 185 12V109H4Z" fill={`url(#${id})`} />{[25, 46, 67, 87, 111, 137, 159, 185].map((x) => <path key={x} d={`M${x} 15V110`} stroke="#eedaa8" opacity=".25" />)}<path d="M4 96 25 79 46 85 67 68 87 57 111 67 137 34 159 39 185 12" fill="none" stroke="#efb328" strokeWidth="2.6" strokeLinejoin="round" /><circle cx="185" cy="12" r="4" fill="#ffb000" />{tool.slug === 'historical-investment-calculator' && <g><circle cx="40" cy="30" r="13" fill="#ffe7a8" stroke="#e8b03c" strokeWidth="2" /><text x="40" y="35" textAnchor="middle" fontSize="13" fontWeight="700" fill="#b9791c">₺</text></g>}</svg>
    case 'compound-interest-calculator': return <div className="mini-calculation mini-compound"><span>10.000 · %40</span><strong>→ 14.049</strong><small>{ru ? '1 год, ежемесячно' : en ? '1 year, monthly' : '1 yıl, aylık'}</small></div>
    case 'savings-calculator': return <div className="mini-savings"><PiggyBank size={38} strokeWidth={1.3} /><div><i /><i /><i /></div><span>{ru ? '+₺1.000 / мес' : en ? '+₺1.000 / mo' : '+₺1.000 / ay'}</span></div>
    case 'percentage-calculator': return <div className="mini-calculation"><span>25% {en && !ru ? 'of' : ru ? 'от' : '×'} 200</span><strong>= 50</strong></div>
    case 'unit-converter': return <div className="mini-converter"><div><span className="unit-token">cm</span><span>100</span></div><ArrowRightLeft size={13} /><div><span className="unit-token">m</span><span>1</span></div></div>
    case 'loan-calculator': return <div className="mini-receipt"><span>{ru ? 'Ежемесячный платёж' : en ? 'Monthly payment' : 'Aylık ödeme'}</span><strong>₺1.248</strong><i /><i /></div>
    case 'vat-calculator': return <div className="mini-tax"><b>{ru ? 'НДС' : en ? 'VAT' : 'KDV'} 20%</b><div><span>Net</span><span>₺100</span></div><div><span>{ru ? 'НДС' : en ? 'VAT' : 'KDV'}</span><span>₺20</span></div><div><b>{ru ? 'Итого' : en ? 'Total' : 'Toplam'}</b><b>₺120</b></div></div>
    case 'qr-code-generator': return <div className="mini-qr"><img src="/images/qr-preview.svg" width="90" height="90" alt="" loading="lazy" /><span /><span /><span /><span /></div>
    case 'json-formatter': return <div className="mini-code"><span>1 &nbsp; {'{'}</span><span>2 &nbsp; <em>"name"</em>: <b>"tools"</b>,</span><span>3 &nbsp; <em>"free"</em>: <i>true</i></span><span>4 &nbsp; {'}'}</span></div>
    case 'password-generator': return <div className="mini-password"><KeyRound size={17} /><span>•••• •••• ••••</span><div><i /><i /><i /><i /></div></div>
    case 'mbti-personality-test': return <div className="mini-personality"><Fingerprint size={54} strokeWidth={1.1} /><span>INFJ</span><span>ENFP</span></div>
    case 'numerology-calculator': return <div className="mini-numerology" aria-hidden="true">{[1, 7, 3, 9].map((n, i) => <span key={n} style={{ '--i': i } as React.CSSProperties}>{n}</span>)}<b>11</b></div>
    case 'leave-planner': return <div className="mini-leave" aria-hidden="true"><div>{['w', 'w', 'h', 'l', 'e', 'e', 'w'].map((kind, index) => <i key={index} className={kind} />)}</div><div>{['l', 'l', 'w', 'w', 'e', 'e', 'w'].map((kind, index) => <i key={index} className={kind} />)}</div><span>{ru ? '9 дней' : en ? '9 days' : '9 gün'}</span></div>
    case 'age-calculator':
    case 'date-difference': return <div className="mini-calendar"><CalendarDays size={26} strokeWidth={1.2} /><strong>{tool.slug === 'age-calculator' ? '28' : '365'}</strong><span>{ru ? (tool.slug === 'age-calculator' ? 'лет' : 'дней') : en ? (tool.slug === 'age-calculator' ? 'years' : 'days') : (tool.slug === 'age-calculator' ? 'yıl' : 'gün')}</span></div>
    case 'salary-calculator': return <div className="mini-wallet"><Wallet size={40} strokeWidth={1.3} /><span>{ru ? 'Брутто' : en ? 'Gross' : 'Brüt'}<ArrowRight size={11} />{ru ? 'Нетто' : 'Net'}</span></div>
    case 'bmi-calculator': return <div className="mini-health"><Scale size={31} strokeWidth={1.3} /><strong>23.5</strong><div><i /><i /><i /><i /></div><Heart className="health-heart" size={18} /></div>
    case 'calorie-calculator': return <div className="mini-energy"><Flame size={37} strokeWidth={1.3} /><span><strong>2.140</strong><small>{ru ? 'ккал / день' : en ? 'kcal / day' : 'kcal / gün'}</small></span></div>
    default: return null
  }
}
