import type { Metadata } from 'next'
import Link from 'next/link'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Gizlilik ve izinler · Privacy',
  description: 'tools.mucahid.dev üzerinde araç girdileri, isteğe bağlı analiz ve reklam izinlerinin nasıl işlendiği.',
  alternates: { canonical: '/privacy' },
}

const sections = [
  {
    title: 'İsteğe bağlı analiz',
    text: 'Google Analytics ve Tag Manager, analiz izni verilmeden yüklenmez. Sayfa görüntüleme olaylarımız site adresini ve sayfa yolunu içerir; sorgu, URL parçası, yönlendiren adres, form girdisi ve parola içermez. Google teknik istek bilgilerini işler ve izin sonrasında analiz çerezleri veya cihaz tanımlayıcıları kullanabilir; bu işlem tamamen anonim değildir. Sayfanın altındaki Gizlilik ayarları panelinden iznini geri çekebilirsin.',
  },
  {
    title: 'Reklamlar',
    text: 'Reklamlar, AdSense hesabı, site onayı ve gerekli izin yönetimi kurulana kadar kapalıdır. Etkinleştirildiğinde yalnızca açıkça etiketlenmiş alanlarda ve reklam izninle gösterilir. Google ve ortakları reklam ölçümü ve kişiselleştirme için çerez veya benzer tanımlayıcılar kullanabilir. Avrupa Ekonomik Alanı, Birleşik Krallık ve İsviçre için reklamları açmadan önce Google sertifikalı izin yönetimi platformu kurulmalıdır; sitemizin tercih paneli tek başına bu platform değildir.',
  },
  {
    title: 'Kullanım sayacı ve cihazındaki veriler',
    text: 'Hangi aracın açıldığına dair toplu sayılar tutulur. Araç girdileri ve kişisel içerikler bu sayaca yazılmaz. Tekrar sayımı sınırlamak için gerekli oturum çerezi kullanılır. Dil, arayüz ve izin tercihleri cihazında saklanır. Tarayıcı depolamayı engellerse izin tercihi yalnızca mevcut sayfada uygulanır.',
  },
  {
    title: 'Sunucu ve güvenlik',
    text: 'Barındırma altyapısı ve Cloudflare standart teknik istek bilgilerini, örneğin IP adresi, tarayıcı bilgisi ve istek zamanını işleyebilir. Araç girdileri sunucuya gönderilmez. Depolanan tercihleri silmek için tarayıcından bu sitenin verilerini temizleyebilirsin.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-[820px] px-4 py-10 sm:px-6 sm:py-14">
          <p className="eyebrow">Gizlilik · Privacy — 30 Eylül 2026</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3rem)] font-extrabold tracking-[-.05em] text-[#101a34]">Verilerin ve izinlerin kontrolü sende.</h1>
          <p className="mt-4 max-w-[68ch] text-[.95rem] leading-relaxed text-[#62708b]">{SITE_NAME} hesaplamaları tarayıcında yapar. Girdiğin sayılar, metinler ve oluşturduğun parolalar sunucuya veya analiz hizmetlerine gönderilmez.</p>
          <div className="mt-8 grid gap-5">
            {sections.map(({ title, text }) => (
              <section key={title} className="rounded-2xl border border-[#e4eaf4] bg-white p-5">
                <h2 className="font-display text-[1.1rem] font-extrabold text-[#26385f]">{title}</h2>
                <p className="mt-2 text-[.82rem] leading-relaxed text-[#687692]">{text}</p>
              </section>
            ))}
            <section className="rounded-2xl border border-[#e4eaf4] bg-white p-5">
              <h2 className="font-display text-[1.1rem] font-extrabold text-[#26385f]">İletişim ve kaynak</h2>
              <p className="mt-2 text-[.82rem] leading-relaxed text-[#687692]">
                İletişim formu cihazındaki e-posta uygulamasını açar; form alanları bu siteye gönderilmez. Kaynak kodu GitHub üzerinde incelenebilir.
                Sorular için <a className="font-semibold text-[#365fbf] underline-offset-4 hover:underline" href="mailto:hello@mucahid.dev">hello@mucahid.dev</a> adresine yazabilirsin.
              </p>
              <a className="focus-ring mt-3 inline-block text-[.82rem] font-semibold text-[#365fbf] underline" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">Google, iş ortağı sitelerindeki bilgileri nasıl kullanır?</a>
            </section>
          </div>
          <Link href="/" className="focus-ring mt-8 inline-flex h-10 items-center rounded-xl border border-[#dce5f4] px-4 text-[.75rem] font-semibold text-[#4d6491] hover:bg-[#f5f7fc]">Ana sayfaya dön · Back home</Link>
        </article>
      </main>
      <Footer />
    </div>
  )
}
