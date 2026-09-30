'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Download, Minimize2, Sparkles } from 'lucide-react'
import QRCode from 'qrcode'
import { useTranslation } from '@/hooks/use-language'
import { formatNumber, type Language } from '@/lib/format'
import { Note, Panel, QuietButton, Select, Submit, TextArea } from './shared'

const QR_SIZES = ['200', '300', '400', '600']
const QR_LEVELS = ['L', 'M', 'Q', 'H'] as const

export function QrTool() {
  const { language, t } = useTranslation()
  const [text, setText] = useState('https://tools.mucahid.dev')
  const [size, setSize] = useState('300')
  const [level, setLevel] = useState<(typeof QR_LEVELS)[number]>('M')
  const [image, setImage] = useState('')
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    const options = { width: Number(size), margin: 2, errorCorrectionLevel: level, color: { dark: '#13203c', light: '#ffffff' } } as const
    Promise.all([QRCode.toDataURL(text || ' ', options), QRCode.toString(text || ' ', { ...options, type: 'svg' })])
      .then(([png, vector]) => { if (!cancelled) { setImage(png); setSvg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(vector)}`); setError('') } })
      .catch(() => { if (!cancelled) { setImage(''); setSvg(''); setError(t('Metin bu hata düzeltme düzeyi için çok uzun. Metni kısalt veya düzeyi düşür.', 'The text is too long for this error-correction level. Shorten it or lower the level.', 'Текст слишком длинный для этого уровня коррекции ошибок. Сократите его или понизьте уровень.')) } })
    return () => { cancelled = true }
  }, [text, size, level, t])
  return <Panel>
    <div className="grid items-start gap-7 lg:grid-cols-[1fr_300px]">
      <div className="grid gap-4">
        <TextArea name="text" label={t('Bağlantı veya metin', 'Link or text', 'Ссылка или текст')} value={text} onChange={setText} rows={5} spellCheck={false} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select name="size" label={t('Boyut', 'Size', 'Размер')} value={size} onChange={setSize} options={QR_SIZES.map((value) => ({ value, label: `${value} × ${value} px` }))} />
          <Select name="level" label={t('Hata düzeltme', 'Error correction', 'Коррекция ошибок')} value={level} onChange={(value) => setLevel(value as (typeof QR_LEVELS)[number])} options={[{ value: 'L', label: t('L · %7 · en küçük kod', 'L · 7% · smallest code', 'L · 7% · самый компактный') }, { value: 'M', label: t('M · %15 · dengeli', 'M · 15% · balanced', 'M · 15% · сбалансированный') }, { value: 'Q', label: t('Q · %25', 'Q · 25%', 'Q · 25%') }, { value: 'H', label: t('H · %30 · logo üstüne uygun', 'H · 30% · survives logos', 'H · 30% · выдерживает логотип') }]} />
        </div>
        <p className="text-[.72rem] leading-relaxed text-[#8792a8]">{t('QR kod cihazında oluşturulur; metin sunucuya gönderilmez.', 'The QR code is generated on your device; the text is never sent to a server.', 'QR-код создаётся на вашем устройстве; текст не отправляется на сервер.')} {formatNumber(new TextEncoder().encode(text).length, language, { maximumFractionDigits: 0 })} {t('bayt', 'bytes', 'байт')}.</p>
        {error && <p role="alert" className="rounded-xl bg-[#fff0f0] px-3.5 py-3 text-[.73rem] text-[#b95555]">{error}</p>}
      </div>
      {image && <div className="justify-self-center rounded-2xl border border-[#e7ebf3] bg-white p-4 shadow-sm"><img src={image} alt={t('Oluşturulan QR kod', 'Generated QR code', 'Сгенерированный QR-код')} width={208} height={208} className="size-52" /><div className="mt-3 grid grid-cols-2 gap-2"><a href={image} download="tools-qr-code.png" className="focus-ring flex h-10 items-center justify-center gap-2 rounded-xl bg-[#eef2ff] text-[.76rem] font-bold text-[#4b68c6]"><Download className="size-4" />PNG</a><a href={svg} download="tools-qr-code.svg" className="focus-ring flex h-10 items-center justify-center gap-2 rounded-xl bg-[#eef2ff] text-[.76rem] font-bold text-[#4b68c6]"><Download className="size-4" />SVG</a></div></div>}
    </div>
  </Panel>
}

function describeJsonError(message: string, language: Language) {
  const position = /position (\d+)/.exec(message)?.[1]
  const detail = position ? (language === 'tr' ? ` (${position}. karakter civarı)` : language === 'ru' ? ` (около символа ${position})` : ` (near character ${position})`) : ''
  return (language === 'tr' ? 'Geçerli bir JSON girin' : language === 'ru' ? 'Введите корректный JSON' : 'Enter valid JSON') + detail + '.'
}

function countNodes(value: unknown): number {
  if (Array.isArray(value)) return 1 + value.reduce<number>((sum, item) => sum + countNodes(item), 0)
  if (value && typeof value === 'object') return 1 + Object.values(value).reduce<number>((sum, item) => sum + countNodes(item), 0)
  return 1
}

export function JsonTool() {
  const { language, t } = useTranslation()
  const [value, setValue] = useState('{"name":"tools","free":true,"tags":["fast","local"]}')
  const [indent, setIndent] = useState('2')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<{ nodes: number; bytes: number } | null>(null)
  const run = (mode: 'format' | 'minify') => {
    try {
      const parsed = JSON.parse(value)
      const text = mode === 'minify' ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent === 'tab' ? '\t' : Number(indent))
      setOutput(text); setError(''); setCopied(false); setStats({ nodes: countNodes(parsed), bytes: new TextEncoder().encode(text).length })
    } catch (caught) {
      setOutput(''); setStats(null); setError(describeJsonError(caught instanceof Error ? caught.message : '', language))
    }
  }
  const copy = async () => { try { await navigator.clipboard.writeText(output); setCopied(true) } catch { setCopied(false) } }
  return <Panel>
    <div className="grid gap-4 lg:grid-cols-2">
      <TextArea name="input" label={t('JSON verisi', 'JSON input', 'Входной JSON')} value={value} onChange={setValue} rows={12} mono spellCheck={false} />
      <div><p className="text-[.76rem] font-semibold text-[#52607b]">{t('Sonuç', 'Output', 'Результат')}</p><pre className="mt-1 h-[calc(12*1.6rem+1.75rem)] overflow-auto rounded-xl bg-[#172641] p-3 font-mono text-[.75rem] leading-relaxed text-[#d4e0fb]" aria-live="polite">{output || t('Sonuç burada görünecek...', 'The result will appear here...', 'Результат появится здесь...')}</pre></div>
    </div>
    {error && <p role="alert" className="mt-3 text-[.78rem] font-semibold text-[#c64a57]">{error}</p>}
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <Submit onClick={() => run('format')}><Sparkles className="size-4" />{t('Biçimlendir', 'Format', 'Форматировать')}</Submit>
      <QuietButton onClick={() => run('minify')}><Minimize2 className="size-3.5" />{t('Sıkıştır', 'Minify', 'Минимизировать')}</QuietButton>
      <QuietButton onClick={copy} pressed={copied}>{copied ? <Check className="size-3.5 text-[#4b9e82]" /> : <Copy className="size-3.5" />}{copied ? t('Kopyalandı', 'Copied', 'Скопировано') : t('Kopyala', 'Copy', 'Копировать')}</QuietButton>
      <div className="ml-auto w-40"><Select name="indent" label={t('Girinti', 'Indent', 'Отступ')} value={indent} onChange={setIndent} options={[{ value: '2', label: t('2 boşluk', '2 spaces', '2 пробела') }, { value: '4', label: t('4 boşluk', '4 spaces', '4 пробела') }, { value: 'tab', label: t('Sekme', 'Tab', 'Табуляция') }]} /></div>
    </div>
    {stats && <p className="mt-3 text-[.7rem] text-[#8290a8]">{formatNumber(stats.nodes, language, { maximumFractionDigits: 0 })} {t('düğüm', 'nodes', 'узлов')} · {formatNumber(stats.bytes, language, { maximumFractionDigits: 0 })} {t('bayt', 'bytes', 'байт')}</p>}
    <Note>{t('Veri tarayıcında işlenir; hiçbir şey sunucuya gönderilmez.', 'Data is processed in your browser; nothing is sent to a server.', 'Данные обрабатываются в браузере; на сервер ничего не отправляется.')}</Note>
  </Panel>
}
