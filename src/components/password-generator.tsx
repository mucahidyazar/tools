'use client'

import { useMemo, useState } from 'react'
import * as Slider from '@radix-ui/react-slider'
import { Check, ChevronDown, Copy, Download, Eye, EyeOff, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { SelectField } from '@/components/ui/select-field'
import { useToolHistoryField } from '@/components/tool-history'
import { DEFAULT_SYMBOLS, GeneratorError, generateSecrets, getGeneratorInfo, type GeneratorErrorCode, type GeneratorOptions, type PasswordOptions, type PassphraseOptions, type PinOptions } from '@/lib/password-generator'
import effWords from '../../public/data/password-words-en.json'

import type { Language } from '@/lib/format'
const inputClass = 'focus-ring h-10 w-full rounded-xl border border-[#dfe6f0] bg-white px-3 text-[.82rem] text-[#273b60] outline-none'
const quietButton = 'focus-ring inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[.73rem] font-semibold text-[#566b93] transition hover:bg-[#e9effb] disabled:cursor-not-allowed disabled:opacity-40'

const messages: Record<GeneratorErrorCode, [string, string, string]> = {
  length: ['Geçerli bir uzunluk seç: şifre 4–128, kelime 4–12, PIN 4–12.', 'Choose a valid length: password 4–128, words 4–12, PIN 4–12.', 'Выберите допустимую длину: пароль 4–128, слова 4–12, PIN 4–12.'],
  groups: ['En az bir karakter grubu seç.', 'Select at least one character group.', 'Выберите хотя бы одну группу символов.'],
  emptyGroup: ['Hariç tutmalar seçili bir grubu boşaltıyor. Seçenekleri değiştir veya o grubu kapat.', 'Exclusions remove an entire enabled group. Change the exclusions or disable that group.', 'Исключения опустошают включённую группу. Измените исключения или отключите эту группу.'],
  symbols: ['Sembol kümesine en az bir noktalama işareti gir. Yalnızca yazdırılabilir ASCII sembolleri desteklenir.', 'Enter at least one punctuation character. Only printable ASCII symbols are supported.', 'Введите хотя бы один знак пунктуации. Поддерживаются только печатные символы ASCII.'],
  exclusions: ['Hariç tutulan karakterler en fazla 256 karakter olabilir.', 'Excluded characters must be 256 characters or fewer.', 'Исключаемых символов может быть не больше 256.'],
  batch: ['Bir kerede 1–50 sonuç oluşturabilirsin.', 'Generate between 1 and 50 results at a time.', 'За раз можно создать от 1 до 50 результатов.'],
  words: ['Kelime listesi doğrulanamadı. Sayfayı yenileyip tekrar dene.', 'The wordlist could not be verified. Reload the page and try again.', 'Не удалось проверить список слов. Обновите страницу и попробуйте снова.'],
  separator: ['Geçerli bir kelime ayırıcı seç.', 'Select a valid word separator.', 'Выберите допустимый разделитель слов.'],
  random: ['Güvenli rastgele üretim kullanılamıyor. Güncel bir tarayıcıda tekrar dene.', 'Secure random generation is unavailable. Try again in an up-to-date browser.', 'Безопасная генерация случайных чисел недоступна. Попробуйте в современном браузере.'],
}

function TextField({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number }) {
  return <label className="grid gap-1.5 text-[.74rem] font-semibold text-[#60718f]">{label}<input value={value} onChange={event => onChange(event.target.value)} className={inputClass} autoComplete="off" spellCheck={false} maxLength={maxLength} /></label>
}

export function PasswordGenerator({ language = 'tr' }: { language?: Language }) {
  const tr = language === 'tr'
  const t = (turkish: string, english: string, russian?: string) => (tr ? turkish : language === 'ru' ? russian ?? english : english)
  const [mode, setMode] = useState<GeneratorOptions['mode']>('password')
  const [password, setPassword] = useState<PasswordOptions>({ mode: 'password', length: 20, lowercase: true, uppercase: true, numbers: true, symbols: true, requireEachGroup: true, excludeSimilar: false, excludeAmbiguous: false, excludeCharacters: '', customSymbols: DEFAULT_SYMBOLS })
  const [phrase, setPhrase] = useState<PassphraseOptions>({ mode: 'passphrase', wordCount: 6, separator: '-', capitalize: false, appendNumber: false })
  const [pin, setPin] = useState<PinOptions>({ mode: 'pin', length: 6, allowLeadingZero: true })
  const [quantity, setQuantity] = useState(1)
  const [result, setResult] = useState<ReturnType<typeof generateSecrets> | null>(null)
  const [generatedWith, setGeneratedWith] = useState('')
  const [revealed, setRevealed] = useState(true)
  const [copied, setCopied] = useState<number | 'all' | null>(null)
  const [notice, setNotice] = useState('')
  const [generationError, setGenerationError] = useState<GeneratorErrorCode | null>(null)
  // Only generator settings are recorded in the local history; generated secrets never are.
  const modeLabels = { password: t('Şifre', 'Password', 'Пароль'), passphrase: t('Kelime dizisi', 'Passphrase', 'Парольная фраза'), pin: 'PIN' }
  useToolHistoryField({ name: 'mode', label: t('Üretim modu', 'Generator mode', 'Режим генератора'), value: mode, onRestore: value => { if (value === 'password' || value === 'passphrase' || value === 'pin') setMode(value) }, format: (value) => modeLabels[value as GeneratorOptions['mode']] ?? null })
  useToolHistoryField({ name: 'password', label: t('Şifre ayarları', 'Password settings', 'Настройки пароля'), value: JSON.stringify(password), onRestore: value => { try { const next = JSON.parse(String(value)); if (next && typeof next === 'object') setPassword(previous => ({ ...previous, ...next, mode: 'password' })) } catch { /* Ignore malformed local history. */ } }, format: (value, lang) => { try { const next = JSON.parse(String(value)); return typeof next.length === 'number' ? `${next.length} ${lang === 'tr' ? 'karakter' : 'characters'}` : null } catch { return null } } })
  useToolHistoryField({ name: 'passphrase', label: t('Kelime dizisi ayarları', 'Passphrase settings', 'Настройки парольной фразы'), value: JSON.stringify(phrase), onRestore: value => { try { const next = JSON.parse(String(value)); if (next && typeof next === 'object') setPhrase(previous => ({ ...previous, ...next, mode: 'passphrase' })) } catch { /* Ignore malformed local history. */ } }, format: () => null })
  useToolHistoryField({ name: 'pin', label: t('PIN ayarları', 'PIN settings', 'Настройки PIN'), value: JSON.stringify(pin), onRestore: value => { try { const next = JSON.parse(String(value)); if (next && typeof next === 'object') setPin(previous => ({ ...previous, ...next, mode: 'pin' })) } catch { /* Ignore malformed local history. */ } }, format: () => null })
  useToolHistoryField({ name: 'quantity', label: t('Üretim adedi', 'Quantity', 'Количество'), value: quantity, onRestore: value => setQuantity(Number(value)), format: (value, lang) => `${value} ${lang === 'tr' ? 'adet' : 'items'}` })
  const options = mode === 'password' ? password : mode === 'passphrase' ? phrase : pin
  const signature = JSON.stringify({ options, quantity })
  const pending = result !== null && generatedWith !== signature
  const preview = useMemo(() => {
    try { return { info: getGeneratorInfo(options, effWords), error: null } }
    catch (error) { return { info: null, error: error instanceof GeneratorError ? error.code : 'random' as const } }
  }, [options])
  const errorCode = quantity < 1 || quantity > 50 || !Number.isInteger(quantity) ? 'batch' : preview.error || generationError
  const length = mode === 'password' ? password.length : mode === 'passphrase' ? phrase.wordCount : pin.length
  const maxLength = mode === 'password' ? 128 : 12
  const updateLength = (value: number) => {
    if (mode === 'password') setPassword(previous => ({ ...previous, length: value }))
    else if (mode === 'passphrase') setPhrase(previous => ({ ...previous, wordCount: value }))
    else setPin(previous => ({ ...previous, length: value }))
  }
  const updatePassword = <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) => setPassword(previous => ({ ...previous, [key]: value }))

  function generate() {
    setGenerationError(null)
    setNotice('')
    setCopied(null)
    try {
      setResult(generateSecrets(options, quantity, effWords))
      setGeneratedWith(signature)
      setNotice(t('Yeni sonuçlar hazır.', 'New results are ready.', 'Новые результаты готовы.'))
    } catch (error) {
      setGenerationError(error instanceof GeneratorError ? error.code : 'random')
    }
  }

  async function copy(index: number | 'all') {
    if (!result) return
    try {
      await navigator.clipboard.writeText(index === 'all' ? result.values.join('\n') : result.values[index])
      setCopied(index)
      setNotice(t('Panoya kopyalandı.', 'Copied to clipboard.', 'Скопировано в буфер обмена.'))
    } catch {
      setNotice(t('Panoya erişilemedi. Sonucu gösterip elle kopyalayabilirsin.', 'Clipboard access failed. Reveal the result to copy it manually.', 'Нет доступа к буферу обмена. Покажите результат и скопируйте вручную.'))
    }
  }

  function download() {
    if (!result) return
    const url = URL.createObjectURL(new Blob([result.values.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'tools-generated-secrets.txt'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <section className="rounded-3xl border border-[#e3e9f2] bg-white p-5 shadow-[0_10px_35px_rgba(43,70,125,.06)] sm:p-7">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-[.75rem] font-semibold text-[#65817d]"><ShieldCheck className="size-4 text-[#4d9c88]" />{t('Cihazında, güvenli rastgele üretim', 'Secure randomness, on your device', 'Надёжная случайность на вашем устройстве')}</div>
      <span className="text-[.7rem] text-[#8b97ad]">{t('Kayıt yok · Sunucuya gönderilmez', 'No storage · Never sent to a server', 'Не сохраняется · Не отправляется на сервер')}</span>
    </div>

    <div className="grid items-start gap-7 lg:grid-cols-[1.05fr_1fr]">
      <form onSubmit={event => { event.preventDefault(); generate() }} className="min-w-0 space-y-5">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#f1f4fa] p-1" aria-label={t('Üretim türü', 'Generator mode', 'Режим генератора')}>
          {([['password', t('Şifre', 'Password', 'Пароль')], ['passphrase', t('Kelime dizisi', 'Passphrase', 'Парольная фраза')], ['pin', 'PIN']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); setGenerationError(null) }} className={`focus-ring rounded-lg px-2 py-2.5 text-[.77rem] font-semibold transition ${mode === value ? 'bg-white text-[#365fbf] shadow-sm' : 'text-[#79869e] hover:text-[#3d5c8c]'}`}>{label}</button>)}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3"><label htmlFor="secret-length" className="text-[.76rem] font-semibold text-[#596b88]">{mode === 'passphrase' ? t('Kelime sayısı', 'Word count', 'Число слов') : t('Uzunluk', 'Length', 'Длина')}</label><input id="secret-length" type="number" min={4} max={maxLength} step={1} value={Number.isFinite(length) ? length : ''} onChange={event => updateLength(Number(event.target.value))} className={`${inputClass} !w-20 text-center font-semibold`} /></div>
          <Slider.Root value={[Math.min(maxLength, Math.max(4, length || 4))]} onValueChange={value => updateLength(value[0])} min={4} max={maxLength} step={1} className="relative flex h-6 touch-none select-none items-center"><Slider.Track className="relative h-1.5 grow rounded-full bg-[#e7edf8]"><Slider.Range className="absolute h-full rounded-full bg-[#5a7cdc]" /></Slider.Track><Slider.Thumb aria-label={mode === 'passphrase' ? t('Kelime sayısı', 'Word count', 'Число слов') : t('Uzunluk', 'Length', 'Длина')} className="focus-ring block size-4 rounded-full border-[3px] border-white bg-[#5678d6] shadow-[0_0_0_1px_#bdccee]" /></Slider.Root>
          <div className="flex justify-between text-[.66rem] text-[#96a2b5]"><span>4</span><span>{maxLength}</span></div>
        </div>

        {mode === 'password' && <>
          <fieldset className="space-y-3"><legend className="mb-2 text-[.76rem] font-semibold text-[#596b88]">{t('Karakterler', 'Characters', 'Символы')}</legend><div className="grid grid-cols-2 gap-x-3 gap-y-3"><Checkbox label={t('Küçük harf · a–z', 'Lowercase · a–z', 'Строчные · a–z')} checked={password.lowercase} onCheckedChange={value => updatePassword('lowercase', value)} /><Checkbox label={t('Büyük harf · A–Z', 'Uppercase · A–Z', 'Прописные · A–Z')} checked={password.uppercase} onCheckedChange={value => updatePassword('uppercase', value)} /><Checkbox label={t('Rakam · 0–9', 'Digits · 0–9', 'Цифры · 0–9')} checked={password.numbers} onCheckedChange={value => updatePassword('numbers', value)} /><Checkbox label={t('Sembol · !@#', 'Symbols · !@#', 'Символы · !@#')} checked={password.symbols} onCheckedChange={value => updatePassword('symbols', value)} /></div></fieldset>
          <details className="group rounded-xl border border-[#e7edf5] px-4 py-3"><summary className="flex cursor-pointer list-none items-center justify-between text-[.76rem] font-semibold text-[#597098]">{t('Gelişmiş seçenekler', 'Advanced options', 'Дополнительные параметры')}<ChevronDown className="size-4 transition group-open:rotate-180" /></summary><div className="mt-4 grid gap-3.5"><Checkbox label={t('Her seçili gruptan en az bir karakter', 'At least one character from each enabled group', 'Хотя бы один символ из каждой включённой группы')} checked={password.requireEachGroup} onCheckedChange={value => updatePassword('requireEachGroup', value)} /><Checkbox label={t('Benzer karakterleri çıkar · iIlL1oO0', 'Exclude similar characters · iIlL1oO0', 'Исключить похожие символы · iIlL1oO0')} checked={password.excludeSimilar} onCheckedChange={value => updatePassword('excludeSimilar', value)} /><Checkbox label={t('Okunması zor noktalama işaretlerini çıkar', 'Exclude ambiguous punctuation', 'Исключить неоднозначную пунктуацию')} checked={password.excludeAmbiguous} onCheckedChange={value => updatePassword('excludeAmbiguous', value)} /><TextField label={t('Kullanılmayacak karakterler', 'Characters to exclude', 'Исключаемые символы')} value={password.excludeCharacters} onChange={value => updatePassword('excludeCharacters', value)} maxLength={256} />{password.symbols && <TextField label={t('İzin verilen semboller', 'Allowed symbols', 'Разрешённые символы')} value={password.customSymbols} onChange={value => updatePassword('customSymbols', value)} maxLength={64} />}<p className="text-[.69rem] leading-relaxed text-[#8b98ad]">{t('Bu seçenekler sitenin şifre kurallarına uyum içindir. Uzunluğu artırmak ve her hesapta farklı şifre kullanmak daha önemlidir.', 'These options help meet a site’s password requirements. Prioritize length and a different password for every account.', 'Эти параметры помогают соответствовать требованиям сайта к паролю. Важнее длина и отдельный пароль для каждого аккаунта.')}</p></div></details>
        </>}

        {mode === 'passphrase' && <div className="space-y-4"><p className="rounded-xl bg-[#f5f8fd] px-3.5 py-3 text-[.74rem] leading-relaxed text-[#70809b]">{t('EFF’nin 7.776 İngilizce kelimesinden bağımsız rastgele seçim. Başlangıç için 6 kelime önerilir.', 'Independent random selections from EFF’s 7,776 English words. Six words is a useful starting point.', 'Независимый случайный выбор из 7 776 английских слов EFF. Шесть слов — хорошая отправная точка.')}</p><SelectField label={t('Kelimeler arası ayırıcı', 'Word separator', 'Разделитель слов')} value={phrase.separator} onChange={value => setPhrase(previous => ({ ...previous, separator: value as PassphraseOptions['separator'] }))} options={[{ value: '-', label: t('Tire (–)', 'Hyphen (–)', 'Дефис (–)') }, { value: ' ', label: t('Boşluk', 'Space', 'Пробел') }, { value: '_', label: t('Alt çizgi (_)', 'Underscore (_)', 'Подчёркивание (_)') }, { value: '.', label: t('Nokta (.)', 'Period (.)', 'Точка (.)') }]} /><div className="grid gap-3"><Checkbox label={t('Kelimelerin ilk harfini büyük yap', 'Capitalize the first letter of each word', 'Первая буква каждого слова заглавная')} checked={phrase.capitalize} onCheckedChange={value => setPhrase(previous => ({ ...previous, capitalize: value }))} /><Checkbox label={t('Sona rastgele iki rakam ekle', 'Append two random digits', 'Добавить две случайные цифры')} checked={phrase.appendNumber} onCheckedChange={value => setPhrase(previous => ({ ...previous, appendNumber: value }))} /></div></div>}

        {mode === 'pin' && <div className="space-y-4"><Checkbox label={t('Sıfır ile başlayabilir', 'Allow a leading zero', 'Разрешить ноль в начале')} checked={pin.allowLeadingZero} onCheckedChange={value => setPin(previous => ({ ...previous, allowLeadingZero: value }))} /><p className="rounded-xl bg-[#fff9ee] p-3.5 text-[.74rem] leading-relaxed text-[#9b7b47]">{t('Kısa PIN’ler, deneme sayısını sınırlayan cihazlar içindir. Hesap şifresi yerine uzun bir şifre veya kelime dizisi seç.', 'Short PINs are for devices that limit attempts. Choose a long password or passphrase for account credentials.', 'Короткие PIN-коды подходят для устройств с ограничением попыток. Для аккаунтов выбирайте длинный пароль или парольную фразу.')}</p></div>}

        <div className="grid grid-cols-[100px_1fr] items-end gap-3"><label className="grid gap-1.5 text-[.74rem] font-semibold text-[#60718f]">{t('Adet', 'Quantity', 'Количество')}<input type="number" min={1} max={50} step={1} value={Number.isFinite(quantity) ? quantity : ''} onChange={event => setQuantity(Number(event.target.value))} className={inputClass} /></label><button type="submit" disabled={!!preview.error || quantity < 1 || quantity > 50 || !Number.isInteger(quantity)} className="focus-ring flex h-10 items-center justify-center gap-2 rounded-xl bg-[#4e75d5] px-4 text-[.8rem] font-semibold text-white transition hover:bg-[#4064bf] disabled:cursor-not-allowed disabled:opacity-45"><RefreshCw className="size-3.5" />{t('Yeni üret', 'Generate new', 'Сгенерировать')}</button></div>
        {errorCode && <p role="alert" className="rounded-xl bg-[#fff0f0] px-3.5 py-3 text-[.73rem] leading-relaxed text-[#b95555]">{messages[errorCode][tr ? 0 : language === 'ru' ? 2 : 1]}</p>}
      </form>

      <div className="min-w-0 rounded-2xl border border-[#e2eafa] bg-[#f7f9fe] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-[.77rem] font-semibold text-[#5a6f94]"><KeyRound className="size-4" />{t('Oluşturulan sonuçlar', 'Generated results', 'Результаты')}</div><button type="button" onClick={() => setRevealed(value => !value)} className={quietButton} aria-pressed={!revealed}>{revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{revealed ? t('Gizle', 'Hide', 'Скрыть') : t('Göster', 'Reveal', 'Показать')}</button></div>
        {result ? <><div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">{result.values.map((value, index) => <div key={index} className="flex items-start gap-2 rounded-xl border border-[#e1e8f5] bg-white p-3"><span className="pt-1 text-[.6rem] tabular-nums text-[#a0aec4]">{String(index + 1).padStart(2, '0')}</span><code className="min-w-0 flex-1 select-all break-all py-0.5 font-mono text-[.89rem] leading-relaxed tracking-[.015em] text-[#2d446e]" aria-label={revealed ? undefined : t('Gizlenmiş sonuç', 'Hidden result', 'Скрытый результат')}>{revealed ? value : '••••••••••••••••'}</code><button type="button" onClick={() => copy(index)} aria-label={`${t('Kopyala', 'Copy', 'Копировать')} ${index + 1}`} className={`${quietButton} !px-2`}>{copied === index ? <Check className="size-3.5 text-[#4b9e82]" /> : <Copy className="size-3.5" />}</button></div>)}</div><div className="mt-3 flex flex-wrap items-center gap-1"><button type="button" onClick={() => copy('all')} className={quietButton}>{copied === 'all' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{t('Tümünü kopyala', 'Copy all', 'Копировать всё')}</button><button type="button" onClick={download} className={quietButton}><Download className="size-3.5" />.txt</button><button type="button" onClick={() => { setResult(null); setCopied(null); setNotice(t('Sonuçlar temizlendi.', 'Results cleared.', 'Результаты очищены.')) }} className={`${quietButton} ml-auto`} aria-label={t('Sonuçları temizle', 'Clear results', 'Очистить результаты')}><Trash2 className="size-3.5" /></button></div><p className="mt-2 text-[.65rem] leading-relaxed text-[#8b98af]">{t('İndirilen dosya ve pano düz metin içerir. Sonuçları güvenli bir parola yöneticisine kaydet.', 'Downloads and the clipboard contain plain text. Save your results in a secure password manager.', 'Скачанный файл и буфер обмена содержат открытый текст. Сохраняйте результаты в надёжном менеджере паролей.')}</p></> : <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-[#d4dff1] px-5 py-8 text-center"><div><LockKeyhole className="mx-auto mb-3 size-7 text-[#a1b4d8]" /><p className="text-[.8rem] font-medium text-[#7285a5]">{t('Şifren burada görünecek', 'Your secret will appear here', 'Здесь появится ваш пароль')}</p><p className="mt-1.5 text-[.71rem] text-[#98a6bd]">{t('Seçeneklerini belirle, ardından “Yeni üret”e bas.', 'Choose your options, then press “Generate new”.', 'Выберите параметры и нажмите «Сгенерировать».')}</p></div></div>}
        {pending && <p className="mt-3 rounded-lg bg-[#fff8e8] px-3 py-2 text-[.7rem] text-[#967947]">{t('Ayarlar değişti. Mevcut sonuçları güncellemek için yeniden üret.', 'Settings changed. Generate again to apply them to your results.', 'Настройки изменились. Сгенерируйте заново, чтобы применить их.')}</p>}
        <div className="mt-5 border-t border-[#e1e8f3] pt-4"><div className="flex items-baseline justify-between gap-2"><p className="text-[.72rem] font-medium text-[#7185a5]">{t('Üretim entropisi', 'Generation entropy', 'Энтропия генерации')}</p><p className="text-[1.1rem] font-semibold tabular-nums text-[#4667a5]">{(result || preview.info)?.entropyBits.toLocaleString(tr ? 'tr-TR' : 'en-US', { maximumFractionDigits: 1 }) ?? '—'} <span className="text-[.7rem] font-normal">bit</span></p></div><p className="mt-2 text-[.68rem] leading-relaxed text-[#8b98af]">{t('Yalnızca bu aracın eşit olasılıklı rastgele üretimini ve seçili kuralları açıklar; kırılma süresi veya güvenlik garantisi değildir. Sabit ayırıcı ve büyük harf düzeni entropiye eklenmez.', 'Describes this tool’s uniform random generation and selected constraints; it is not a cracking-time estimate or security guarantee. Fixed separators and capitalization add no entropy.', 'Описывает равномерную случайную генерацию и выбранные ограничения; это не оценка времени взлома и не гарантия безопасности. Фиксированные разделители и заглавные буквы энтропии не добавляют.')}</p></div>
        <p aria-live="polite" aria-atomic="true" className="mt-3 min-h-4 text-[.71rem] font-medium text-[#4b8d7b]">{notice}</p>
      </div>
    </div>

    <details className="group mt-6 border-t border-[#edf0f6] pt-4"><summary className="flex cursor-pointer list-none items-center gap-2 text-[.71rem] font-semibold text-[#8290a8]">{t('Nasıl çalışır? Kaynaklar', 'How it works · Sources', 'Как это работает · Источники')}<ChevronDown className="size-3.5 transition group-open:rotate-180" /></summary><div className="mt-3 space-y-2 text-[.7rem] leading-relaxed text-[#8b98ab]"><p>{t('Rastgelelik, tarayıcının Web Crypto API’sinden gelir. Eşit olasılıklı seçim için rejection sampling kullanılır. Şifreler tarayıcı belleğinde tutulur; yerel depolamaya, analitiğe veya bir API’ye yazılmaz. Sayfadan ayrılınca geçmiş tutulmaz.', 'Randomness comes from the browser’s Web Crypto API. Rejection sampling avoids biased selections. Secrets stay in browser memory; they are never written to local storage, analytics or an API. No history is kept after leaving the page.', 'Случайность даёт Web Crypto API браузера. Выборка с отклонением исключает смещение. Пароли остаются в памяти браузера и никогда не записываются в локальное хранилище, аналитику или API. После ухода со страницы история не хранится.')}</p><p>{t('NIST ve OWASP uzun, benzersiz şifreleri destekler; karakter karışımı seçenekleri mevcut sitelerin kurallarına uyum içindir.', 'NIST and OWASP favor long, unique passwords; character-mix options help meet existing sites’ requirements.', 'NIST и OWASP рекомендуют длинные уникальные пароли; параметры набора символов помогают соблюсти требования существующих сайтов.')} <a className="underline underline-offset-2" href="https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver">NIST</a> · <a className="underline underline-offset-2" href="https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#implement-proper-password-strength-controls">OWASP</a> · <a className="underline underline-offset-2" href="https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues">MDN</a></p><p>{t('İngilizce kelime listesi:', 'English wordlist:', 'Английский список слов:')} <a className="underline underline-offset-2" href="https://www.eff.org/dice">EFF Long Wordlist — Electronic Frontier Foundation / Joseph Bonneau</a> · <a className="underline underline-offset-2" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. {t('Kelimeler değiştirilmedi; zar numaraları kaldırılıp JSON biçimine dönüştürüldü.', 'Words are unchanged; dice indices were removed and the list converted to JSON.', 'Слова не изменены; номера бросков удалены, список преобразован в JSON.')}</p></div></details>
  </section>
}
