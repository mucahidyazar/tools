export type ToolPromotion = {
  slug: string
  kind: 'recommended' | 'new'
  startsAt: string
  endsAt: string
  /** Higher priorities appear first in every sort order. */
  priority: number
}

/** UTC dates are inclusive at the start and exclusive at the end. */
export const TOOL_PROMOTIONS: readonly ToolPromotion[] = [
  {
    slug: 'leave-planner',
    kind: 'new',
    startsAt: '2026-09-27T00:00:00Z',
    endsAt: '2026-11-01T00:00:00Z',
    priority: 180,
  },
  {
    slug: 'compound-interest-calculator',
    kind: 'recommended',
    startsAt: '2026-09-26T00:00:00Z',
    endsAt: '2026-10-10T00:00:00Z',
    priority: 200,
  },
  {
    slug: 'historical-investment-calculator',
    kind: 'new',
    startsAt: '2026-09-26T00:00:00Z',
    endsAt: '2026-10-17T00:00:00Z',
    priority: 150,
  },
  {
    slug: 'password-generator',
    kind: 'new',
    startsAt: '2026-09-26T00:00:00Z',
    endsAt: '2026-10-10T00:00:00Z',
    priority: 100,
  },
]

// Update this date when publishing a tool, rather than deriving it from its use count.
export const TOOL_RELEASE_DATES: Readonly<Record<string, string>> = {
  'leave-planner': '2026-09-27',
  'compound-interest-calculator': '2026-09-26',
  'investment-calculator': '2026-09-27',
  'savings-calculator': '2026-09-27',
  'historical-money-value': '2026-09-26',
  'historical-investment-calculator': '2026-09-26',
  'percentage-calculator': '2026-09-26',
  'unit-converter': '2026-09-26',
  'loan-calculator': '2026-09-26',
  'vat-calculator': '2026-09-26',
  'qr-code-generator': '2026-09-26',
  'mbti-personality-test': '2026-09-26',
  'numerology-calculator': '2026-09-26',
  'age-calculator': '2026-09-26',
  'date-difference': '2026-09-26',
  'roi-calculator': '2026-09-26',
  'salary-calculator': '2026-09-26',
  'bmi-calculator': '2026-09-26',
  'calorie-calculator': '2026-09-26',
  'password-generator': '2026-09-26',
  'json-formatter': '2026-09-26',
  'monthly-inflation-rates': '2026-09-26',
}
