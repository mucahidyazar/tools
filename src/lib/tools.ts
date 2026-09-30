export type ToolCategory = 'Finans' | 'Dönüştürücüler' | 'Günlük' | 'Geliştirici' | 'Üretkenlik' | 'Jeneratörler' | 'Sağlık'

export type ToolDefinition = {
  slug: string
  title: string
  description: string
  category: ToolCategory
  icon: string
  accent: string
  /** Search terms that are not in the visible copy. */
  keywords?: string[]
  status?: 'Hazır' | 'Yakında'
}

export const categories: Array<{ label: ToolCategory | 'Tümü'; icon: string }> = [
  { label: 'Tümü', icon: 'grid' },
  { label: 'Finans', icon: 'chart' },
  { label: 'Dönüştürücüler', icon: 'arrow' },
  { label: 'Günlük', icon: 'calendar' },
  { label: 'Geliştirici', icon: 'code' },
  { label: 'Sağlık', icon: 'heart' },
  { label: 'Jeneratörler', icon: 'sparkles' },
]

export const tools: ToolDefinition[] = [
  { slug: 'compound-interest-calculator', title: 'Bileşik Faiz Hesaplama', description: 'Bir tutarın bileşik faizle nasıl büyüdüğünü, APR/APY farkını ve bileşik sıklığının etkisini görün.', category: 'Finans', icon: 'percent', accent: 'mint', keywords: ['faiz', 'mevduat', 'bileşik faiz', 'faiz getirisi', 'apy', 'apr'] },
  { slug: 'investment-calculator', title: 'Yatırım Hesaplama', description: 'Başlangıç tutarı, düzenli katkı ve getiri oranıyla yatırımınızın yıllara göre büyümesini planlayın.', category: 'Finans', icon: 'trending', accent: 'green', keywords: ['yatırım', 'getiri', 'portföy', 'düzenli yatırım', 'bileşik'] },
  { slug: 'savings-calculator', title: 'Tasarruf Hesaplama', description: 'Aylık birikimle paranızın ne kadar büyüyeceğini, ana para ve faiz payını hesaplayın.', category: 'Finans', icon: 'piggy', accent: 'sky', keywords: ['tasarruf', 'birikim', 'aylık birikim', 'hedef'] },
  { slug: 'home-cost-calculator', title: 'Ev Maliyeti Hesaplama', description: 'Bir evin toplam satın alma maliyetini, vergi ve masraflarıyla görün.', category: 'Finans', icon: 'home', accent: 'rose', status: 'Yakında', keywords: ['konut', 'tapu'] },
  { slug: 'historical-money-value', title: 'Tarihsel Para Değeri', description: 'Geçmişteki paranızın bugünkü alım gücünü resmi enflasyon verisiyle karşılaştırın.', category: 'Finans', icon: 'coins', accent: 'amber', keywords: ['enflasyon', 'alım gücü', 'tüfe'] },
  { slug: 'historical-investment-calculator', title: 'Geçmişte Yatırım Yapsaydım', description: 'Dolar, euro, altın, mevduat veya NASDAQ’a geçmişte yatırım yapsaydınız bugün ne olurdu? Gerçek verilerle, istediğiniz para biriminde.', category: 'Finans', icon: 'coins', accent: 'amber', keywords: ['altın', 'dolar', 'mevduat', 'yatırım', 'getiri', 'geçmiş', 'simülasyon'] },
  { slug: 'percentage-calculator', title: 'Yüzde Hesaplama', description: 'Yüzde, artış, azalış ve oran hesaplarını saniyeler içinde yapın.', category: 'Finans', icon: 'percent', accent: 'lavender', keywords: ['yüzde', 'indirim', 'zam'] },
  { slug: 'unit-converter', title: 'Birim Dönüştürücü', description: 'Uzunluk, ağırlık, sıcaklık ve daha fazlasını kolayca dönüştürün.', category: 'Dönüştürücüler', icon: 'repeat', accent: 'sky', keywords: ['cm', 'inch', 'kg', 'pound', 'mil', 'km'] },
  { slug: 'loan-calculator', title: 'Kredi Ödeme', description: 'Aylık taksit, toplam faiz, ana para / faiz dağılımı ve ödeme planını hesaplayın.', category: 'Finans', icon: 'calculator', accent: 'mint', keywords: ['kredi', 'taksit', 'amortisman', 'konut kredisi', 'ihtiyaç kredisi'] },
  { slug: 'vat-calculator', title: 'KDV / Vergi Hesaplama', description: 'Tutarın KDV dahil ve hariç karşılığını anında bulun.', category: 'Finans', icon: 'file', accent: 'peach', keywords: ['kdv', 'vergi', 'brüt', 'net'] },
  { slug: 'qr-code-generator', title: 'QR Kod Oluşturucu', description: 'Bağlantı ve metinleriniz için PNG veya SVG olarak QR kod üretin.', category: 'Jeneratörler', icon: 'qr', accent: 'pink', keywords: ['qr', 'karekod'] },
  { slug: 'mbti-personality-test', title: 'Kişilik Tipi Testi', description: '32 soruluk tercih envanteriyle dört boyuttaki eğilimlerinizi ve yaklaşık tipinizi keşfedin.', category: 'Günlük', icon: 'sparkles', accent: 'violet', keywords: ['mbti', 'kişilik', '16 tip', 'introvert', 'extrovert'] },
  { slug: 'numerology-calculator', title: 'Numeroloji Hesaplama', description: 'Doğum tarihinizden ve isminizden yaşam yolu, kader ve kişisel yıl sayılarınızı keşfedin.', category: 'Günlük', icon: 'sparkles', accent: 'lavender', keywords: ['numeroloji', 'yaşam yolu', 'kader sayısı'] },
  { slug: 'leave-planner', title: 'İzin Planlayıcı', description: 'Yıllık izin günlerinizi resmi tatil ve hafta sonlarıyla birleştirip en uzun tatili çıkaracak günleri bulun.', category: 'Günlük', icon: 'luggage', accent: 'peach', keywords: ['izin', 'tatil', 'köprü', 'resmi tatil', 'yıllık izin', 'bayram'] },
  { slug: 'age-calculator', title: 'Yaş Hesaplama', description: 'Yaşınızı yıl, ay ve gün olarak kesin şekilde hesaplayın.', category: 'Günlük', icon: 'calendar', accent: 'blue', keywords: ['yaş', 'doğum günü'] },
  { slug: 'date-difference', title: 'Tarih Farkı', description: 'İki tarih arasındaki süreyi gün, hafta, ay ve iş günü olarak bulun.', category: 'Günlük', icon: 'calendar', accent: 'sky', keywords: ['gün sayma', 'iş günü'] },
  { slug: 'roi-calculator', title: 'ROI / Kâr Hesaplama', description: 'Yatırımınızın getirisini ve bugünkü reel karşılığını ölçün.', category: 'Finans', icon: 'trending', accent: 'green', keywords: ['roi', 'getiri', 'kâr'] },
  { slug: 'salary-calculator', title: 'Brüt ↔ Net Maaş', description: 'Türkiye, ABD, Birleşik Krallık ve Almanya için maaşınızın vergi ve kesintiler sonrası karşılığını görün.', category: 'Finans', icon: 'wallet', accent: 'mint', keywords: ['maaş', 'brüt', 'net', 'sgk', 'gelir vergisi', 'bordro'] },
  { slug: 'bmi-calculator', title: 'BMI Hesaplama', description: 'Boy ve kilonuza göre vücut kitle indeksinizi ve sağlıklı kilo aralığınızı hesaplayın.', category: 'Sağlık', icon: 'heart', accent: 'rose', keywords: ['bmi', 'vücut kitle indeksi', 'kilo'] },
  { slug: 'calorie-calculator', title: 'Kalori / TDEE', description: 'Günlük kalori ihtiyacınızı ve hedefinize göre alım miktarını kişiselleştirin.', category: 'Sağlık', icon: 'flame', accent: 'orange', keywords: ['kalori', 'tdee', 'bmr', 'diyet'] },
  { slug: 'password-generator', title: 'Şifre Oluşturucu', description: 'Güçlü şifreler, kelime dizileri ve PIN’ler üretin; hepsi cihazınızda kalır.', category: 'Geliştirici', icon: 'lock', accent: 'indigo', keywords: ['şifre', 'parola', 'passphrase', 'pin'] },
  { slug: 'json-formatter', title: 'JSON Formatlayıcı', description: 'JSON verilerinizi düzenleyin, doğrulayın, sıkıştırın ve okunur hale getirin.', category: 'Geliştirici', icon: 'code', accent: 'blue', keywords: ['json', 'format', 'minify'] },
  { slug: 'monthly-inflation-rates', title: 'Aylık Enflasyon Oranları', description: 'Seçtiğiniz ülkenin yıllara göre aylık ve yıllık enflasyon görünümünü inceleyin.', category: 'Finans', icon: 'chart', accent: 'amber', keywords: ['enflasyon', 'tüfe', 'cpi'] },
]

export const getTool = (slug: string) => tools.find((tool) => tool.slug === slug)

/** Turkish slugs used before the catalog moved to English URLs; kept as permanent redirects. */
export const LEGACY_TOOL_SLUGS: Readonly<Record<string, string>> = {
  'faiz-hesaplama': 'compound-interest-calculator',
  'interest-calculator': 'compound-interest-calculator',
  'ev-maliyeti-hesaplama': 'home-cost-calculator',
  'tarihsel-para-degeri': 'historical-money-value',
  'gecmiste-yatirim': 'historical-investment-calculator',
  'investment-simulator': 'historical-investment-calculator',
  'yuzde-hesaplama': 'percentage-calculator',
  'kredi-odeme': 'loan-calculator',
  'kdv-vergi': 'vat-calculator',
  'qr-code': 'qr-code-generator',
  mbti: 'mbti-personality-test',
  numeroloji: 'numerology-calculator',
  'roi-profit': 'roi-calculator',
  'maas-hesaplama': 'salary-calculator',
  bmi: 'bmi-calculator',
  'kalori-tdee': 'calorie-calculator',
  'sifre-olusturucu': 'password-generator',
  'json-formatlayici': 'json-formatter',
  'enflasyon-oranlari': 'monthly-inflation-rates',
}

export const toolEnglish: Record<string, { title: string; description: string }> = {
  'compound-interest-calculator': { title: 'Compound interest calculator', description: 'See how an amount grows with compound interest, the APR/APY difference and the effect of compounding frequency.' },
  'investment-calculator': { title: 'Investment calculator', description: 'Plan how an investment grows year by year from a starting amount, regular contributions and a return rate.' },
  'savings-calculator': { title: 'Savings calculator', description: 'See how monthly savings grow and how much of the result is principal versus interest.' },
  'home-cost-calculator': { title: 'Home cost calculator', description: 'Estimate the total cost of buying a home, including taxes and fees.' },
  'historical-money-value': { title: 'Historical money value', description: 'Compare the buying power of money across time using official inflation data.' },
  'historical-investment-calculator': { title: 'If I had invested', description: 'What if you had bought dollars, euros, gold, a deposit or NASDAQ back then? Real data, in the currency you choose.' },
  'percentage-calculator': { title: 'Percentage calculator', description: 'Calculate percentages, increases, decreases and ratios in seconds.' },
  'unit-converter': { title: 'Unit converter', description: 'Convert length, weight, temperature and more in one place.' },
  'loan-calculator': { title: 'Loan calculator', description: 'See monthly payments, total interest, the principal/interest split and the repayment schedule.' },
  'vat-calculator': { title: 'VAT / tax calculator', description: 'Add or remove VAT from any amount instantly.' },
  'qr-code-generator': { title: 'QR code generator', description: 'Create QR codes for links and text as PNG or SVG.' },
  'mbti-personality-test': { title: 'Personality type test', description: 'Discover your leanings on four dimensions and your approximate type with a 32-item inventory.' },
  'numerology-calculator': { title: 'Numerology calculator', description: 'Explore life path, destiny and personal year numbers from your birth date and name.' },
  'leave-planner': { title: 'Leave planner', description: 'Find the leave days that turn public holidays and weekends into the longest breaks.' },
  'age-calculator': { title: 'Age calculator', description: 'Find your exact age in years, months and days.' },
  'date-difference': { title: 'Date difference', description: 'Calculate the distance between two dates in days, weeks, months and weekdays.' },
  'roi-calculator': { title: 'ROI / profit calculator', description: 'Measure your return and today’s inflation-adjusted value.' },
  'salary-calculator': { title: 'Gross ↔ net salary', description: 'Estimate take-home pay for Türkiye, the US, the UK and Germany after tax and deductions.' },
  'bmi-calculator': { title: 'BMI calculator', description: 'Calculate your body mass index and healthy weight range from height and weight.' },
  'calorie-calculator': { title: 'Calorie / TDEE', description: 'Estimate your daily energy needs and a target for your goal.' },
  'password-generator': { title: 'Password generator', description: 'Create strong passwords, passphrases and PINs locally in your browser.' },
  'json-formatter': { title: 'JSON formatter', description: 'Format, validate, minify and beautify JSON data.' },
  'monthly-inflation-rates': { title: 'Monthly inflation rates', description: 'Explore monthly and annual inflation by country and year.' },
}

export const categoryNames: Readonly<Record<'tr' | 'en' | 'ru', Record<string, string>>> = {
  tr: { Tümü: 'Tümü', Finans: 'Finans', Dönüştürücüler: 'Dönüştürücüler', Günlük: 'Günlük', Geliştirici: 'Geliştirici', Sağlık: 'Sağlık', Jeneratörler: 'Jeneratörler' },
  en: { Tümü: 'All', Finans: 'Finance', Dönüştürücüler: 'Converters', Günlük: 'Everyday', Geliştirici: 'Developers', Sağlık: 'Health', Jeneratörler: 'Generators' },
  ru: { Tümü: 'Все', Finans: 'Финансы', Dönüştürücüler: 'Конвертеры', Günlük: 'Повседневные', Geliştirici: 'Разработка', Sağlık: 'Здоровье', Jeneratörler: 'Генераторы' },
}

export const toolRussian: Record<string, { title: string; description: string }> = {
  'compound-interest-calculator': { title: 'Калькулятор сложных процентов', description: 'Посмотрите, как сумма растёт со сложными процентами, разницу APR/APY и влияние частоты капитализации.' },
  'investment-calculator': { title: 'Инвестиционный калькулятор', description: 'Спланируйте рост инвестиций по годам: стартовая сумма, регулярные взносы и ставка доходности.' },
  'savings-calculator': { title: 'Калькулятор накоплений', description: 'Узнайте, как растут ежемесячные накопления и какая часть результата — вклад, а какая — проценты.' },
  'home-cost-calculator': { title: 'Стоимость покупки жилья', description: 'Оцените полную стоимость покупки жилья с налогами и сборами.' },
  'historical-money-value': { title: 'Стоимость денег во времени', description: 'Сравните покупательную способность денег в разные годы по официальным данным инфляции.' },
  'historical-investment-calculator': { title: 'Если бы я инвестировал', description: 'Что было бы, если бы вы купили доллары, евро, золото, вклад или NASDAQ тогда? Реальные данные, в выбранной валюте.' },
  'percentage-calculator': { title: 'Калькулятор процентов', description: 'Проценты, рост, снижение и доли за секунды.' },
  'unit-converter': { title: 'Конвертер единиц', description: 'Длина, вес, температура и многое другое в одном месте.' },
  'loan-calculator': { title: 'Кредитный калькулятор', description: 'Ежемесячный платёж, общая переплата, соотношение тела и процентов, график погашения.' },
  'vat-calculator': { title: 'Калькулятор НДС', description: 'Мгновенно добавьте или выделите НДС из любой суммы.' },
  'qr-code-generator': { title: 'Генератор QR-кодов', description: 'Создавайте QR-коды для ссылок и текста в PNG или SVG.' },
  'mbti-personality-test': { title: 'Тест типа личности', description: 'Определите свои предпочтения по четырём шкалам и приблизительный тип с помощью опросника из 32 пунктов.' },
  'numerology-calculator': { title: 'Нумерологический калькулятор', description: 'Число жизненного пути, судьбы и личного года по дате рождения и имени.' },
  'leave-planner': { title: 'Планировщик отпуска', description: 'Подберите дни отпуска, которые вместе с праздниками и выходными дают самые длинные каникулы.' },
  'age-calculator': { title: 'Калькулятор возраста', description: 'Точный возраст в годах, месяцах и днях.' },
  'date-difference': { title: 'Разница между датами', description: 'Интервал между двумя датами в днях, неделях, месяцах и рабочих днях.' },
  'roi-calculator': { title: 'Калькулятор ROI', description: 'Измерьте доходность инвестиции и её реальную стоимость с учётом инфляции.' },
  'salary-calculator': { title: 'Зарплата брутто ↔ нетто', description: 'Оцените зарплату на руки для Турции, США, Великобритании и Германии после налогов и отчислений.' },
  'bmi-calculator': { title: 'Калькулятор ИМТ', description: 'Индекс массы тела и здоровый диапазон веса по росту и весу.' },
  'calorie-calculator': { title: 'Калории / TDEE', description: 'Суточная потребность в энергии и цель по калориям.' },
  'password-generator': { title: 'Генератор паролей', description: 'Надёжные пароли, парольные фразы и PIN-коды — всё остаётся на вашем устройстве.' },
  'json-formatter': { title: 'Форматирование JSON', description: 'Форматируйте, проверяйте, минимизируйте и делайте JSON читаемым.' },
  'monthly-inflation-rates': { title: 'Месячная инфляция', description: 'Месячная и годовая инфляция по странам и годам.' },
}

/** Title and description of a tool in the active language; Russian and English fall back to Turkish. */
export function toolCopy(slug: string, language: 'tr' | 'en' | 'ru') {
  const tool = getTool(slug)
  const localized = language === 'en' ? toolEnglish[slug] : language === 'ru' ? toolRussian[slug] : undefined
  return { title: localized?.title ?? tool?.title ?? slug, description: localized?.description ?? tool?.description ?? '' }
}
