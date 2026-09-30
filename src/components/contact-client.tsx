'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, Mail, Send, ShieldCheck, Sparkles, Database, Github } from 'lucide-react'
import { useTranslation } from '@/hooks/use-language'
import { Field, Panel, Select, TextArea } from '@/components/tools/shared'

const CONTACT_EMAIL = 'hello@mucahid.dev'
type Topic = 'suggestion' | 'request' | 'bug' | 'other'
const TOPICS: Topic[] = ['suggestion', 'request', 'bug', 'other']

export function ContactClient() {
  const { t } = useTranslation()
  const [topic, setTopic] = useState<Topic>('suggestion')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('topic')
    if (TOPICS.includes(requested as Topic)) setTopic(requested as Topic)
  }, [])
  const topicLabels: Record<Topic, string> = { suggestion: t('Araç önerisi', 'Tool suggestion', 'Предложение инструмента'), request: t('İstek / geliştirme', 'Request / improvement', 'Запрос / улучшение'), bug: t('Hata bildirimi', 'Bug report', 'Сообщение об ошибке'), other: t('Diğer', 'Other', 'Другое') }
  const messageError = message.trim().length < 10 ? t('Mesaj en az 10 karakter olmalı.', 'The message needs at least 10 characters.', 'Сообщение должно содержать не менее 10 символов.') : ''
  const emailError = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? t('Geçerli bir e-posta adresi gir.', 'Enter a valid email address.', 'Введите корректный адрес электронной почты.') : ''
  const subject = `[tools.mucahid.dev] ${topicLabels[topic]}${name.trim() ? ` — ${name.trim()}` : ''}`
  const body = [message.trim(), '', name.trim() ? `${t('İsim', 'Name', 'Имя')}: ${name.trim()}` : '', email.trim() ? `${t('E-posta', 'Email', 'Эл. почта')}: ${email.trim()}` : '', `${t('Sayfa', 'Page', 'Страница')}: tools.mucahid.dev`].filter((line, index) => line !== '' || index === 1).join('\n')
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (messageError || emailError) return
    window.location.href = mailto
  }
  const facts = [
    { icon: ShieldCheck, title: t('Gizlilik öncelikli', 'Privacy first', 'Приватность прежде всего'), text: t('Hesaplamalar tarayıcında yapılır; girdiğin sayılar, metinler ve şifreler sunucuya gönderilmez. Yalnızca hangi aracın kaç kez açıldığı anonim olarak sayılır.', 'Calculations run in your browser; the numbers, texts and passwords you enter are never sent to a server. Only anonymous tool-open counts are recorded.', 'Расчёты выполняются в браузере; введённые числа, тексты и пароли не отправляются на сервер. Анонимно считается только количество открытий инструментов.') },
    { icon: Database, title: t('Açık veri', 'Open data', 'Открытые данные'), text: t('Enflasyon, kur, altın ve endeks verileri FRED (St. Louis Fed) ve Dünya Bankası’ndan alınır; her araçta kaynak ve kapsam belirtilir.', 'Inflation, exchange-rate, gold and index data come from FRED (St. Louis Fed) and the World Bank; every tool states its source and coverage.', 'Данные об инфляции, курсах, золоте и индексах берутся из FRED (ФРБ Сент-Луиса) и Всемирного банка; в каждом инструменте указаны источник и охват.') },
    { icon: Sparkles, title: t('Ücretsiz ve üyeliksiz', 'Free, no sign-up', 'Бесплатно и без регистрации'), text: t('Tüm araçlar ücretsizdir; reklam ve takip yoktur. Sonuçlar bilgilendirme amaçlıdır; finansal, sağlık veya hukuki tavsiye değildir.', 'Every tool is free, with no ads or tracking. Results are for information only and are not financial, health or legal advice.', 'Все инструменты бесплатны, без рекламы и трекинга. Результаты носят справочный характер и не являются финансовой, медицинской или юридической консультацией.') },
  ]
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
    <section aria-labelledby="about-heading" className="space-y-4">
      <div><p className="eyebrow">{t('Hakkında', 'About', 'О сайте')}</p><h2 id="about-heading" className="mt-2 font-display text-[1.5rem] font-extrabold tracking-[-.03em] text-[#1c2846]">{t('Günlük problemler için küçük, dürüst araçlar.', 'Small, honest tools for everyday problems.', 'Небольшие честные инструменты для повседневных задач.')}</h2><p className="mt-2 text-[.9rem] leading-relaxed text-[#5f6d8a]">{t('tools.mucahid.dev, sık ihtiyaç duyulan hesaplamaları ve dönüşümleri tek yerde, hızlı ve şeffaf biçimde sunmak için yapıldı. Her araç varsayımlarını ve veri kaynağını açıkça yazar.', 'tools.mucahid.dev brings the calculations and conversions people need most into one fast, transparent place. Every tool states its assumptions and data sources.', 'tools.mucahid.dev собирает самые нужные расчёты и конвертации в одном быстром и прозрачном месте. Каждый инструмент указывает свои допущения и источники данных.')}</p></div>
      <ul className="grid gap-3">{facts.map(({ icon: Icon, title, text }) => <li key={title} className="flex gap-3 rounded-2xl border border-[#e7ecf5] bg-white p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#4c68d2]"><Icon className="size-5" strokeWidth={1.7} aria-hidden="true" /></span><div><p className="text-[.85rem] font-bold text-[#2f4470]">{title}</p><p className="mt-1 text-[.78rem] leading-relaxed text-[#6d7b95]">{text}</p></div></li>)}</ul>
      <p className="text-[.8rem] text-[#6d7b95]">{t('Geliştiren', 'Built by', 'Автор')}: <a href="https://mucahid.dev" target="_blank" rel="noreferrer" className="font-semibold text-[#3f4c68] underline-offset-4 hover:underline">mucahid.dev</a> · <a href="https://github.com/mucahid" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#3f4c68] underline-offset-4 hover:underline"><Github className="size-3.5" aria-hidden="true" />GitHub</a></p>
    </section>

    <Panel className="scroll-mt-24" >
      <form id="contact-form" onSubmit={submit} noValidate>
        <p className="eyebrow">{t('İletişim', 'Contact', 'Контакты')}</p>
        <h2 className="mt-2 font-display text-[1.3rem] font-extrabold tracking-[-.03em] text-[#1c2846]">{t('Öneri, istek veya hata bildir', 'Send a suggestion, request or bug', 'Предложение, запрос или ошибка')}</h2>
        <p className="mt-1 text-[.8rem] leading-relaxed text-[#6d7b95]">{t('Formu doldurup gönderdiğinde e-posta uygulaman mesajınla birlikte açılır; oradan gönderirsin. İstersen doğrudan da yazabilirsin:', 'When you submit, your mail app opens with the message ready to send. You can also write directly:', 'После отправки формы откроется ваш почтовый клиент с готовым сообщением. Можно написать и напрямую:')} <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-1 font-semibold text-[#365fbf] underline-offset-4 hover:underline">{CONTACT_EMAIL}<ArrowUpRight className="size-3.5" aria-hidden="true" /></a></p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Select name="topic" label={t('Konu', 'Topic', 'Тема')} value={topic} onChange={(value) => setTopic(value as Topic)} options={TOPICS.map((value) => ({ value, label: topicLabels[value] }))} />
          <Field name="name" type="text" label={t('İsim (isteğe bağlı)', 'Name (optional)', 'Имя (необязательно)')} value={name} onChange={setName} placeholder={t('Adın', 'Your name', 'Ваше имя')} />
          <div className="sm:col-span-2"><Field name="email" type="email" label={t('E-posta (yanıt için, isteğe bağlı)', 'Email (for a reply, optional)', 'Эл. почта (для ответа, необязательно)')} value={email} onChange={setEmail} placeholder="you@example.com" />{touched && emailError && <p role="alert" className="mt-1 text-[.7rem] font-semibold text-[#c64a57]">{emailError}</p>}</div>
          <div className="sm:col-span-2"><TextArea name="message" label={t('Mesaj', 'Message', 'Сообщение')} value={message} onChange={setMessage} rows={6} placeholder={t('Hangi aracı istersin, ne eksik, ne bozuk?', 'Which tool would you like, what is missing, what is broken?', 'Какой инструмент нужен, чего не хватает, что сломано?')} />{touched && messageError && <p role="alert" className="mt-1 text-[.7rem] font-semibold text-[#c64a57]">{messageError}</p>}</div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#4d76df] px-5 text-[.76rem] font-bold text-white shadow-[0_7px_14px_rgba(74,115,222,.2)] transition hover:bg-[#3f66ca]"><Send className="size-4" aria-hidden="true" />{t('E-posta uygulamasında aç', 'Open in mail app', 'Открыть в почтовом клиенте')}</button>
          <a href={`mailto:${CONTACT_EMAIL}`} className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-[#e0e7f1] px-4 text-[.74rem] font-bold text-[#566b93] transition hover:bg-[#f5f7fb]"><Mail className="size-4" aria-hidden="true" />{t('Boş e-posta gönder', 'Send a blank email', 'Написать письмо')}</a>
        </div>
        <p className="mt-3 text-[.68rem] text-[#94a0b4]">{t('Form verileri sunucuya gönderilmez; yalnızca e-posta bağlantısı oluşturulur.', 'Form data is not sent to a server; it only builds the email link.', 'Данные формы не отправляются на сервер — формируется только почтовая ссылка.')}</p>
      </form>
    </Panel>
  </div>
}
