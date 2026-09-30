/**
 * Turkish gross-to-net payroll estimate. Parameters are published yearly by the Ministry of
 * Treasury and Finance and SGK; every figure used here is listed in SALARY_PARAMETER_SETS
 * with its year so the UI can state exactly which assumptions apply.
 */
export type TaxBracket = { upTo: number | null; rate: number }
export type SalaryParameters = {
  year: number
  /** Monthly gross minimum wage used for the SGK ceiling and the minimum-wage tax exemption. */
  minimumWageGross: number
  sgkEmployeeRate: number
  unemploymentEmployeeRate: number
  /** SGK premium base is capped at this multiple of the minimum wage. */
  sgkCeilingMultiplier: number
  stampTaxRate: number
  /** Cumulative annual income-tax brackets for wage income. */
  brackets: readonly TaxBracket[]
  source: string
}

export const SALARY_PARAMETERS_2025: SalaryParameters = {
  year: 2025,
  minimumWageGross: 26005.5,
  sgkEmployeeRate: 0.14,
  unemploymentEmployeeRate: 0.01,
  sgkCeilingMultiplier: 7.5,
  stampTaxRate: 0.00759,
  brackets: [
    { upTo: 158_000, rate: 0.15 },
    { upTo: 330_000, rate: 0.2 },
    { upTo: 1_200_000, rate: 0.27 },
    { upTo: 4_300_000, rate: 0.35 },
    { upTo: null, rate: 0.4 },
  ],
  source: 'Gelir Vergisi Kanunu 103. madde (2025 ücret tarifesi), 2025 asgari ücret tebliği, Damga Vergisi Kanunu',
}

export const SALARY_PARAMETER_SETS: readonly SalaryParameters[] = [SALARY_PARAMETERS_2025]

export function salaryParametersFor(year: number) {
  return SALARY_PARAMETER_SETS.find((set) => set.year === year) ?? SALARY_PARAMETER_SETS[SALARY_PARAMETER_SETS.length - 1]
}

/** Tax on `amount` when it is added on top of `cumulativeBase` already taxed this year. */
export function progressiveTax(cumulativeBase: number, amount: number, brackets: readonly TaxBracket[]) {
  let remaining = Math.max(0, amount)
  let position = Math.max(0, cumulativeBase)
  let tax = 0
  for (const bracket of brackets) {
    if (remaining <= 0) break
    const ceiling = bracket.upTo ?? Number.POSITIVE_INFINITY
    if (position >= ceiling) continue
    const portion = Math.min(remaining, ceiling - position)
    tax += portion * bracket.rate
    remaining -= portion
    position += portion
  }
  return tax
}

export type SalaryMonth = {
  month: number
  gross: number
  sgk: number
  unemployment: number
  taxBase: number
  cumulativeBase: number
  incomeTaxGross: number
  incomeTaxExemption: number
  incomeTax: number
  stampTaxGross: number
  stampTaxExemption: number
  stampTax: number
  net: number
}
export type SalaryOptions = { minimumWageExemption?: boolean; months?: number }
export type SalaryBreakdown = {
  parameters: SalaryParameters
  months: SalaryMonth[]
  totalGross: number
  totalNet: number
  averageNet: number
  totalSgk: number
  totalIncomeTax: number
  totalStampTax: number
}

/** Rounds to cents the way payroll software does, tolerating binary floating-point noise. */
const round = (value: number) => Math.round(Number((value * 100).toFixed(6))) / 100

/** Constant monthly gross for a calendar year, with cumulative brackets rising month by month. */
export function grossToNet(monthlyGross: number, parameters: SalaryParameters = SALARY_PARAMETERS_2025, options: SalaryOptions = {}): SalaryBreakdown {
  const gross = Number.isFinite(monthlyGross) ? Math.max(0, monthlyGross) : 0
  const months = Math.min(12, Math.max(1, Math.floor(options.months ?? 12)))
  const exemption = options.minimumWageExemption ?? true
  const ceiling = parameters.minimumWageGross * parameters.sgkCeilingMultiplier
  const premiumBase = Math.min(gross, ceiling)
  const sgk = round(premiumBase * parameters.sgkEmployeeRate)
  const unemployment = round(premiumBase * parameters.unemploymentEmployeeRate)
  const taxBase = Math.max(0, gross - sgk - unemployment)
  const exemptBase = parameters.minimumWageGross - round(parameters.minimumWageGross * parameters.sgkEmployeeRate) - round(parameters.minimumWageGross * parameters.unemploymentEmployeeRate)
  const stampTaxGross = gross * parameters.stampTaxRate
  const stampTaxExemption = exemption ? Math.min(stampTaxGross, parameters.minimumWageGross * parameters.stampTaxRate) : 0
  const rows: SalaryMonth[] = []
  let cumulativeBase = 0
  for (let month = 1; month <= months; month += 1) {
    const incomeTaxGross = progressiveTax(cumulativeBase, taxBase, parameters.brackets)
    const incomeTaxExemption = exemption ? Math.min(incomeTaxGross, progressiveTax(exemptBase * (month - 1), Math.min(exemptBase, taxBase), parameters.brackets)) : 0
    const incomeTax = incomeTaxGross - incomeTaxExemption
    const stampTax = stampTaxGross - stampTaxExemption
    const net = gross - sgk - unemployment - incomeTax - stampTax
    rows.push({ month, gross: round(gross), sgk: round(sgk), unemployment: round(unemployment), taxBase: round(taxBase), cumulativeBase: round(cumulativeBase + taxBase), incomeTaxGross: round(incomeTaxGross), incomeTaxExemption: round(incomeTaxExemption), incomeTax: round(incomeTax), stampTaxGross: round(stampTaxGross), stampTaxExemption: round(stampTaxExemption), stampTax: round(stampTax), net: round(net) })
    cumulativeBase += taxBase
  }
  const totalNet = rows.reduce((sum, row) => sum + row.net, 0)
  return {
    parameters,
    months: rows,
    totalGross: round(gross * months),
    totalNet: round(totalNet),
    averageNet: round(totalNet / months),
    totalSgk: round(rows.reduce((sum, row) => sum + row.sgk + row.unemployment, 0)),
    totalIncomeTax: round(rows.reduce((sum, row) => sum + row.incomeTax, 0)),
    totalStampTax: round(rows.reduce((sum, row) => sum + row.stampTax, 0)),
  }
}

/** Finds the gross that yields the requested net in a given month (January by default). */
export function netToGross(targetNet: number, parameters: SalaryParameters = SALARY_PARAMETERS_2025, options: SalaryOptions & { month?: number } = {}) {
  const target = Number.isFinite(targetNet) ? Math.max(0, targetNet) : 0
  if (target === 0) return 0
  const month = Math.min(12, Math.max(1, Math.floor(options.month ?? 1)))
  const netFor = (gross: number) => grossToNet(gross, parameters, { ...options, months: month }).months[month - 1].net
  let low = 0
  let high = Math.max(target * 2, parameters.minimumWageGross)
  while (netFor(high) < target) high *= 2
  for (let iteration = 0; iteration < 60 && high - low > 0.005; iteration += 1) {
    const middle = (low + high) / 2
    if (netFor(middle) < target) low = middle
    else high = middle
  }
  return round(high)
}
