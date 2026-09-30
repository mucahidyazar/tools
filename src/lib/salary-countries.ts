/**
 * Simplified annual payroll models for several countries. Each model states its year and
 * assumptions; results are estimates for a single employee with no dependants or extras.
 */
import type { Language } from './format'
import { grossToNet as turkishGrossToNet, SALARY_PARAMETERS_2025, progressiveTax, type TaxBracket } from './salary'

export type SalaryCountry = 'TR' | 'US' | 'GB' | 'DE' | 'CUSTOM'
export const SALARY_COUNTRIES: readonly SalaryCountry[] = ['TR', 'US', 'GB', 'DE', 'CUSTOM']
type Localized = Record<Language, string>
export type SalaryLine = { key: string; label: Localized; amount: number }
export type AnnualBreakdown = { gross: number; net: number; lines: SalaryLine[]; taxable: number }
export type CountryOptions = {
  /** Türkiye: apply the minimum-wage income/stamp tax exemption. */
  minimumWageExemption?: boolean
  /** United States: flat state + local income tax rate (%) on top of federal tax. */
  stateTaxPercent?: number
  /** Germany: church tax (9% of income tax) and the childless care-insurance surcharge. */
  churchTax?: boolean
  childless?: boolean
  /** Custom: flat employee rates (%). */
  customSocialPercent?: number
  customIncomeTaxPercent?: number
  customOtherPercent?: number
  customCurrency?: string
}
export type CountryModel = {
  country: SalaryCountry
  currency: string
  year: number
  name: Localized
  source: Localized
  assumptions: Localized
  compute: (annualGross: number, options: CountryOptions) => AnnualBreakdown
}

const L = (tr: string, en: string, ru: string): Localized => ({ tr, en, ru })
const clamp = (value: number | undefined, fallback = 0) => (Number.isFinite(value) ? Math.max(0, value as number) : fallback)

const US_2025 = {
  standardDeduction: 15_000,
  brackets: [{ upTo: 11_925, rate: 0.1 }, { upTo: 48_475, rate: 0.12 }, { upTo: 103_350, rate: 0.22 }, { upTo: 197_300, rate: 0.24 }, { upTo: 250_525, rate: 0.32 }, { upTo: 626_350, rate: 0.35 }, { upTo: null, rate: 0.37 }] as TaxBracket[],
  socialSecurityRate: 0.062, socialSecurityWageBase: 176_100, medicareRate: 0.0145, additionalMedicareRate: 0.009, additionalMedicareThreshold: 200_000,
}
const UK_2025 = { personalAllowance: 12_570, allowanceTaperStart: 100_000, basicLimit: 50_270, higherLimit: 125_140, basicRate: 0.2, higherRate: 0.4, additionalRate: 0.45, niThreshold: 12_570, niUpperLimit: 50_270, niMainRate: 0.08, niUpperRate: 0.02 }
const DE_2025 = { basicAllowance: 12_096, employeeAllowance: 1_230, specialExpenses: 36, pensionRate: 0.093, unemploymentRate: 0.013, pensionCeiling: 96_600, healthRate: 0.073, healthAdditionalHalf: 0.0125, careRate: 0.018, careChildlessSurcharge: 0.006, healthCeiling: 66_150, solidarityExemption: 19_950, solidarityRate: 0.055, solidarityPhaseRate: 0.119, churchTaxRate: 0.09 }

/** German income tax 2025 (§32a EStG) for a single filer. */
export function germanIncomeTax2025(taxable: number) {
  const income = Math.floor(Math.max(0, taxable))
  if (income <= 12_096) return 0
  if (income <= 17_443) { const y = (income - 12_096) / 10_000; return Math.floor((932.3 * y + 1_400) * y) }
  if (income <= 68_480) { const z = (income - 17_443) / 10_000; return Math.floor((176.64 * z + 2_397) * z + 1_015.13) }
  if (income <= 277_825) return Math.floor(0.42 * income - 10_911.92)
  return Math.floor(0.45 * income - 19_246.67)
}

export const COUNTRY_MODELS: Readonly<Record<SalaryCountry, CountryModel>> = {
  TR: {
    country: 'TR', currency: 'TRY', year: SALARY_PARAMETERS_2025.year, name: L('Türkiye', 'Türkiye', 'Турция'),
    source: L(SALARY_PARAMETERS_2025.source, 'Income Tax Law art. 103 (2025 wage schedule), 2025 minimum wage notice, Stamp Tax Law', 'Ст. 103 Закона о подоходном налоге (шкала 2025), уведомление о МРОТ 2025, Закон о гербовом сборе'),
    assumptions: L('İşçi payı SGK %14 + işsizlik %1 (tavan asgari ücretin 7,5 katı), kümülatif gelir vergisi dilimleri, damga vergisi binde 7,59, asgari ücret istisnası; her ay aynı brüt, tek işveren, bekâr.', 'Employee social security 14% + unemployment 1% (ceiling 7.5× minimum wage), cumulative income-tax brackets, stamp tax 0.759%, minimum-wage exemption; same gross every month, single employer, single.', 'Взносы работника: соцстрахование 14% + от безработицы 1% (потолок 7,5 МРОТ), кумулятивные ступени подоходного налога, гербовый сбор 0,759%, освобождение в размере МРОТ; одинаковое брутто каждый месяц, один работодатель, без семьи.'),
    compute: (annualGross, options) => {
      const breakdown = turkishGrossToNet(annualGross / 12, SALARY_PARAMETERS_2025, { minimumWageExemption: options.minimumWageExemption ?? true })
      return { gross: breakdown.totalGross, net: breakdown.totalNet, taxable: breakdown.months.reduce((sum, month) => sum + month.taxBase, 0), lines: [
        { key: 'social', label: L('SGK + işsizlik', 'Social security + unemployment', 'Соцстрахование + от безработицы'), amount: breakdown.totalSgk },
        { key: 'income', label: L('Gelir vergisi', 'Income tax', 'Подоходный налог'), amount: breakdown.totalIncomeTax },
        { key: 'stamp', label: L('Damga vergisi', 'Stamp tax', 'Гербовый сбор'), amount: breakdown.totalStampTax },
      ] }
    },
  },
  US: {
    country: 'US', currency: 'USD', year: 2025, name: L('ABD (federal)', 'United States (federal)', 'США (федеральный)'),
    source: L('IRS Rev. Proc. 2024-40 (2025 dilimleri ve standart indirim), SSA 2025 ücret tabanı', 'IRS Rev. Proc. 2024-40 (2025 brackets and standard deduction), SSA 2025 wage base', 'IRS Rev. Proc. 2024-40 (ставки и стандартный вычет 2025), база SSA 2025'),
    assumptions: L('Bekâr beyan, standart indirim 15.000 $, federal dilimler %10–37, Sosyal Güvenlik %6,2 (176.100 $ tabanına kadar) + Medicare %1,45 (+%0,9 200.000 $ üstü). Eyalet/yerel vergi isteğe bağlı sabit oran; 401(k), sağlık primi ve krediler hariç.', 'Single filer, standard deduction $15,000, federal brackets 10–37%, Social Security 6.2% (up to the $176,100 wage base) + Medicare 1.45% (+0.9% above $200,000). State/local tax as an optional flat rate; 401(k), health premiums and credits excluded.', 'Одиночная декларация, стандартный вычет 15 000 $, федеральные ставки 10–37%, Social Security 6,2% (до базы 176 100 $) + Medicare 1,45% (+0,9% свыше 200 000 $). Налог штата/местный — необязательная плоская ставка; 401(k), медстраховка и кредиты не учитываются.'),
    compute: (annualGross, options) => {
      const taxable = Math.max(0, annualGross - US_2025.standardDeduction)
      const federal = progressiveTax(0, taxable, US_2025.brackets)
      const socialSecurity = Math.min(annualGross, US_2025.socialSecurityWageBase) * US_2025.socialSecurityRate
      const medicare = annualGross * US_2025.medicareRate + Math.max(0, annualGross - US_2025.additionalMedicareThreshold) * US_2025.additionalMedicareRate
      const state = annualGross * (clamp(options.stateTaxPercent) / 100)
      const lines: SalaryLine[] = [
        { key: 'income', label: L('Federal gelir vergisi', 'Federal income tax', 'Федеральный подоходный налог'), amount: federal },
        { key: 'social', label: L('Sosyal Güvenlik + Medicare (FICA)', 'Social Security + Medicare (FICA)', 'Social Security + Medicare (FICA)'), amount: socialSecurity + medicare },
        ...(state > 0 ? [{ key: 'state', label: L('Eyalet / yerel vergi', 'State / local tax', 'Налог штата / местный'), amount: state }] : []),
      ]
      return { gross: annualGross, taxable, net: annualGross - lines.reduce((sum, line) => sum + line.amount, 0), lines }
    },
  },
  GB: {
    country: 'GB', currency: 'GBP', year: 2025, name: L('Birleşik Krallık (İngiltere, Galler, K. İrlanda)', 'United Kingdom (England, Wales, N. Ireland)', 'Великобритания (Англия, Уэльс, Сев. Ирландия)'),
    source: L('HMRC 2025/26 gelir vergisi oranları ve Sınıf 1 Ulusal Sigorta', 'HMRC 2025/26 income tax rates and Class 1 National Insurance', 'Ставки подоходного налога HMRC 2025/26 и национальное страхование класса 1'),
    assumptions: L('Kişisel indirim 12.570 £ (100.000 £ üstünde her 2 £ için 1 £ azalır), dilimler %20 / %40 / %45, çalışan Ulusal Sigortası %8 (12.570–50.270 £) ve %2 üstü. İskoçya dilimleri, öğrenci kredisi ve emeklilik kesintisi hariç.', 'Personal allowance £12,570 (tapered £1 per £2 above £100,000), bands 20% / 40% / 45%, employee National Insurance 8% (£12,570–50,270) and 2% above. Scottish bands, student loans and pension contributions excluded.', 'Личный вычет 12 570 £ (уменьшается на 1 £ за каждые 2 £ свыше 100 000 £), ставки 20% / 40% / 45%, национальное страхование работника 8% (12 570–50 270 £) и 2% выше. Шотландские ставки, студенческие займы и пенсионные взносы не учитываются.'),
    compute: (annualGross) => {
      const allowance = Math.max(0, UK_2025.personalAllowance - Math.max(0, annualGross - UK_2025.allowanceTaperStart) / 2)
      const taxable = Math.max(0, annualGross - allowance)
      const basic = Math.min(taxable, UK_2025.basicLimit - UK_2025.personalAllowance) * UK_2025.basicRate
      const higher = Math.min(Math.max(0, taxable - (UK_2025.basicLimit - UK_2025.personalAllowance)), UK_2025.higherLimit - UK_2025.basicLimit) * UK_2025.higherRate
      const additional = Math.max(0, taxable - (UK_2025.higherLimit - UK_2025.personalAllowance)) * UK_2025.additionalRate
      const ni = Math.min(Math.max(0, annualGross - UK_2025.niThreshold), UK_2025.niUpperLimit - UK_2025.niThreshold) * UK_2025.niMainRate + Math.max(0, annualGross - UK_2025.niUpperLimit) * UK_2025.niUpperRate
      const lines: SalaryLine[] = [{ key: 'income', label: L('Gelir vergisi', 'Income tax', 'Подоходный налог'), amount: basic + higher + additional }, { key: 'social', label: L('Ulusal Sigorta', 'National Insurance', 'Национальное страхование'), amount: ni }]
      return { gross: annualGross, taxable, net: annualGross - lines.reduce((sum, line) => sum + line.amount, 0), lines }
    },
  },
  DE: {
    country: 'DE', currency: 'EUR', year: 2025, name: L('Almanya', 'Germany', 'Германия'),
    source: L('§32a EStG 2025 tarifesi, 2025 sosyal sigorta oranları ve tavanları (BMAS)', '§32a EStG 2025 schedule, 2025 social insurance rates and ceilings (BMAS)', 'Шкала §32a EStG 2025, ставки и пределы соцстрахования 2025 (BMAS)'),
    assumptions: L('Vergi sınıfı I, bekâr, çocuksuz; çalışan payı emeklilik %9,3 + işsizlik %1,3 (tavan 96.600 €), sağlık %7,3 + ek prim ortalaması %1,25, bakım %1,8 (+%0,6 çocuksuz) (tavan 66.150 €); çalışan gider götürüsü 1.230 €, sosyal primler matrahtan düşülür; dayanışma vergisi ve isteğe bağlı kilise vergisi (%9). Yaklaşık sonuçtur.', 'Tax class I, single, no children; employee pension 9.3% + unemployment 1.3% (ceiling €96,600), health 7.3% + average additional 1.25%, care 1.8% (+0.6% childless) (ceiling €66,150); employee allowance €1,230, social contributions deducted from the tax base; solidarity surcharge and optional church tax (9%). Approximate.', 'Налоговый класс I, без семьи и детей; взносы работника: пенсионное 9,3% + от безработицы 1,3% (потолок 96 600 €), медицинское 7,3% + средняя надбавка 1,25%, по уходу 1,8% (+0,6% без детей) (потолок 66 150 €); вычет работника 1 230 €, соцвзносы вычитаются из базы; надбавка солидарности и необязательный церковный налог (9%). Приблизительно.'),
    compute: (annualGross, options) => {
      const pensionBase = Math.min(annualGross, DE_2025.pensionCeiling), healthBase = Math.min(annualGross, DE_2025.healthCeiling)
      const pension = pensionBase * DE_2025.pensionRate, unemployment = pensionBase * DE_2025.unemploymentRate
      const health = healthBase * (DE_2025.healthRate + DE_2025.healthAdditionalHalf), care = healthBase * (DE_2025.careRate + (options.childless ? DE_2025.careChildlessSurcharge : 0))
      const taxable = Math.max(0, annualGross - DE_2025.employeeAllowance - DE_2025.specialExpenses - pension - health - care)
      const incomeTax = germanIncomeTax2025(taxable)
      const solidarity = incomeTax <= DE_2025.solidarityExemption ? 0 : Math.min(incomeTax * DE_2025.solidarityRate, (incomeTax - DE_2025.solidarityExemption) * DE_2025.solidarityPhaseRate)
      const church = options.churchTax ? incomeTax * DE_2025.churchTaxRate : 0
      const lines: SalaryLine[] = [
        { key: 'income', label: L('Gelir vergisi', 'Income tax', 'Подоходный налог'), amount: incomeTax },
        ...(solidarity > 0 ? [{ key: 'solidarity', label: L('Dayanışma vergisi', 'Solidarity surcharge', 'Надбавка солидарности'), amount: solidarity }] : []),
        ...(church > 0 ? [{ key: 'church', label: L('Kilise vergisi', 'Church tax', 'Церковный налог'), amount: church }] : []),
        { key: 'social', label: L('Emeklilik + işsizlik', 'Pension + unemployment insurance', 'Пенсионное + страхование от безработицы'), amount: pension + unemployment },
        { key: 'health', label: L('Sağlık + bakım sigortası', 'Health + care insurance', 'Медицинское + страхование по уходу'), amount: health + care },
      ]
      return { gross: annualGross, taxable, net: annualGross - lines.reduce((sum, line) => sum + line.amount, 0), lines }
    },
  },
  CUSTOM: {
    country: 'CUSTOM', currency: '', year: new Date().getFullYear(), name: L('Kendi oranlarım', 'My own rates', 'Свои ставки'),
    source: L('Girdiğin oranlar', 'The rates you enter', 'Введённые вами ставки'),
    assumptions: L('Sosyal güvenlik payı brüt üzerinden, gelir vergisi sosyal güvenlik sonrası matrah üzerinden sabit oranla, diğer kesintiler brüt üzerinden hesaplanır.', 'Social security is applied to gross pay, income tax as a flat rate on gross minus social security, and other deductions on gross pay.', 'Соцстрахование считается от брутто, подоходный налог — плоской ставкой от брутто за вычетом соцстрахования, прочие удержания — от брутто.'),
    compute: (annualGross, options) => {
      const social = annualGross * (clamp(options.customSocialPercent) / 100)
      const taxable = Math.max(0, annualGross - social)
      const income = taxable * (clamp(options.customIncomeTaxPercent) / 100)
      const other = annualGross * (clamp(options.customOtherPercent) / 100)
      const lines: SalaryLine[] = [{ key: 'social', label: L('Sosyal güvenlik', 'Social security', 'Социальное страхование'), amount: social }, { key: 'income', label: L('Gelir vergisi', 'Income tax', 'Подоходный налог'), amount: income }, ...(other > 0 ? [{ key: 'other', label: L('Diğer kesintiler', 'Other deductions', 'Прочие удержания'), amount: other }] : [])]
      return { gross: annualGross, taxable, net: annualGross - lines.reduce((sum, line) => sum + line.amount, 0), lines }
    },
  },
}

export function computeAnnual(country: SalaryCountry, monthlyGross: number, options: CountryOptions = {}): AnnualBreakdown {
  const gross = Number.isFinite(monthlyGross) ? Math.max(0, monthlyGross) : 0
  return COUNTRY_MODELS[country].compute(gross * 12, options)
}

/** Monthly gross that yields the requested average monthly net, found by bisection. */
export function monthlyGrossForNet(country: SalaryCountry, monthlyNet: number, options: CountryOptions = {}) {
  const target = Number.isFinite(monthlyNet) ? Math.max(0, monthlyNet) : 0
  if (target === 0) return 0
  const netFor = (gross: number) => computeAnnual(country, gross, options).net / 12
  let low = 0, high = Math.max(target * 2, 1)
  let guard = 0
  while (netFor(high) < target && guard++ < 40) high *= 2
  for (let iteration = 0; iteration < 60 && high - low > 0.005; iteration += 1) {
    const middle = (low + high) / 2
    if (netFor(middle) < target) low = middle
    else high = middle
  }
  return Math.round(high * 100) / 100
}
