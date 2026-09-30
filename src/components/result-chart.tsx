'use client'

import { useEffect, useRef, useState } from 'react'
import type { Language } from '@/lib/format'

export type ChartAxis = { label: string; value: number; max?: number; color?: string; display?: string }

function point(index: number, total: number, radius: number, center = 110) {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2
  return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius }
}
function pointsFor(axes: ChartAxis[], radius: number) {
  return axes.map((axis, index) => { const max = axis.max ?? 1; const p = point(index, axes.length, Math.max(0, Math.min(1, axis.value / max)) * radius); return `${p.x},${p.y}` }).join(' ')
}

/** Radar of the eight preference letters; the legend repeats every value for screen readers and small screens. */
export function PreferenceRadar({ axes, centerLabel, ariaLabel }: { axes: ChartAxis[]; centerLabel?: string; ariaLabel: string }) {
  const levels = [1, .75, .5, .25]
  return <div className="result-chart"><svg viewBox="0 0 220 220" role="img" aria-label={ariaLabel}>{levels.map((level) => <polygon key={level} points={pointsFor(axes.map((axis) => ({ ...axis, value: level, max: 1 })), 78)} fill="none" stroke="#dfe7f4" strokeWidth="1" />)}{axes.map((axis, index) => { const p = point(index, axes.length, 78); return <line key={axis.label} x1="110" y1="110" x2={p.x} y2={p.y} stroke="#e0e7f3" strokeWidth="1" /> })}<polygon points={pointsFor(axes, 78)} fill="#6c83df35" stroke="#5979d6" strokeWidth="2" strokeLinejoin="round" />{axes.map((axis, index) => { const p = point(index, axes.length, Math.max(0, Math.min(1, axis.value / (axis.max ?? 1))) * 78); return <circle key={axis.label} cx={p.x} cy={p.y} r="4" fill={axis.color ?? '#5979d6'} stroke="white" strokeWidth="2" /> })}<circle cx="110" cy="110" r="20" fill="white" stroke="#e2e8f3" /><text x="110" y="114" textAnchor="middle" className="chart-center">{centerLabel ?? '·'}</text>{axes.map((axis, index) => { const p = point(index, axes.length, 100); return <text key={axis.label} x={p.x} y={p.y + (p.y < 110 ? -5 : 13)} textAnchor="middle" className="chart-label">{axis.label}</text> })}</svg><ul className="chart-legend">{axes.map((axis) => <li key={axis.label}><i style={{ background: axis.color ?? '#5979d6' }} /><b>{axis.display ?? axis.value}</b> {axis.label}</li>)}</ul></div>
}

export type NumerologyWheelValue = { label: string; number: number | string; position: number; color?: string }

/** A circular numerology profile: the ring maps 1–9, and the polygon connects the birth-date dimensions. */
export function NumerologyWheel({ values, centerLabel, centerCaption, ariaLabel }: { values: NumerologyWheelValue[]; centerLabel: string; centerCaption: string; ariaLabel: string }) {
  const center = 120
  const ring = 77
  const positions = (number: number) => { const angle = -Math.PI / 2 + ((number - 1) / 9) * Math.PI * 2; return { x: center + Math.cos(angle) * ring, y: center + Math.sin(angle) * ring } }
  const path = values.map((item) => { const p = positions(item.position); return `${p.x},${p.y}` }).join(' ')
  return <div className="numerology-wheel"><svg viewBox="0 0 240 240" role="img" aria-label={ariaLabel}><circle cx={center} cy={center} r="94" fill="#f9faff" stroke="#e3e9f5" /><circle cx={center} cy={center} r="77" fill="none" stroke="#d6e0f1" strokeDasharray="2 4" />{values.length > 1 && <polyline points={`${path} ${path.split(' ')[0]}`} fill="#7488dc20" stroke="#6c80d4" strokeWidth="2" strokeLinejoin="round" />}{Array.from({ length: 9 }, (_, index) => { const number = index + 1; const p = positions(number); const active = values.filter((item) => item.position === number); return <g key={number}><circle cx={p.x} cy={p.y} r={active.length ? 16 : 13} fill={active[0]?.color ?? '#eef2fb'} stroke={active.length ? active[0]?.color ?? '#6c80d4' : '#dce5f2'} strokeWidth="1.5" /><text x={p.x} y={p.y + 4} textAnchor="middle" className={active.length ? 'wheel-number wheel-number-active' : 'wheel-number'}>{number}</text>{active.length > 1 && <text x={p.x} y={p.y + 26} textAnchor="middle" className="wheel-dot">{active.length}</text>}</g> })}<circle cx={center} cy={center} r="27" fill="white" stroke="#e0e7f3" /><text x={center} y={center - 2} textAnchor="middle" className="wheel-center-number">{centerLabel}</text><text x={center} y={center + 11} textAnchor="middle" className="wheel-center-label">{centerCaption}</text></svg><ul className="wheel-legend">{values.map((item) => <li key={item.label}><i style={{ background: item.color ?? '#6c80d4' }} /><b>{item.number}</b>{item.label}</li>)}</ul></div>
}

export type LineSeries = { label: string; color: string; values: number[]; dashed?: boolean }

function formatCompact(value: number, language: Language) {
  return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

/** A compact multi-line chart. Series share one x axis; `xLabels` are shown at evenly spaced positions. */
function useContainerWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => setWidth(Math.max(280, Math.round(element.getBoundingClientRect().width)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

export function LineChart({ series, xLabels, formatValue, ariaLabel, language }: { series: LineSeries[]; xLabels: string[]; formatValue: (value: number) => string; ariaLabel: string; language: Language }) {
  const { ref, width: measured } = useContainerWidth<HTMLElement>(640)
  const compact = measured < 480
  const width = measured, height = compact ? 220 : 250, left = compact ? 54 : 64, right = 14, top = 14, bottom = 34
  const innerWidth = width - left - right, innerHeight = height - top - bottom
  const longest = Math.max(1, ...series.map((item) => item.values.length))
  const maxValue = Math.max(1e-9, ...series.flatMap((item) => item.values))
  const ticks = [0, .25, .5, .75, 1].map((ratio) => ratio * maxValue)
  const x = (index: number) => left + (longest === 1 ? 0 : (index / (longest - 1)) * innerWidth)
  const y = (value: number) => top + innerHeight - (value / maxValue) * innerHeight
  return <figure className="line-chart" ref={ref}>
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={ariaLabel}>
      {ticks.map((tick) => <g key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#e4eaf4" /><text x={left - 6} y={y(tick) + 3} textAnchor="end" className="line-chart-tick">{compact ? formatCompact(tick, language) : formatValue(tick)}</text></g>)}
      {series.map((item) => <polyline key={item.label} fill="none" stroke={item.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={item.dashed ? '5 5' : undefined} points={item.values.map((value, index) => `${x(index)},${y(value)}`).join(' ')} />)}
      {series.map((item) => { const last = item.values.length - 1; return last >= 0 ? <circle key={item.label} cx={x(last)} cy={y(item.values[last])} r="4" fill={item.color} stroke="white" strokeWidth="2" /> : null })}
      {xLabels.map((label, index) => <text key={`${label}-${index}`} x={left + (xLabels.length === 1 ? 0 : (index / (xLabels.length - 1)) * innerWidth)} y={height - 12} textAnchor={index === 0 ? 'start' : index === xLabels.length - 1 ? 'end' : 'middle'} className="line-chart-tick">{label}</text>)}
    </svg>
    <figcaption className="chart-legend line-chart-legend">{series.map((item) => <span key={item.label}><i style={{ background: item.color }} />{item.label}: <b>{item.values.length ? formatValue(item.values[item.values.length - 1]) : '—'}</b></span>)}<span className="line-chart-hint">{language === 'tr' ? 'Aylık değerler' : language === 'ru' ? 'Помесячно' : 'Monthly values'}</span></figcaption>
  </figure>
}
