import type { RawSalary, SalaryInterval } from '@/types'

/** Full-time equivalents used to express any pay interval as a monthly amount. */
const MONTHLY_FACTOR: Record<SalaryInterval, number> = {
  YEAR: 1 / 12,
  MONTH: 1,
  WEEK: 52 / 12,
  DAY: 260 / 12,
  HOUR: 2080 / 12,
}

export type MonthlySalary = {
  minSalary: number | null
  maxSalary: number | null
  currency: string | null
}

const NO_SALARY: MonthlySalary = { minSalary: null, maxSalary: null, currency: null }

/** Converts an ATS salary range to whole monthly amounts in its original currency. */
export function toMonthlySalary(salary: RawSalary | null): MonthlySalary {
  if (!salary || (salary.min === null && salary.max === null)) return NO_SALARY
  const factor = MONTHLY_FACTOR[salary.interval]
  const convert = (value: number | null) => (value === null ? null : Math.round(value * factor))
  return {
    minSalary: convert(salary.min),
    maxSalary: convert(salary.max),
    currency: salary.currency?.toUpperCase() ?? null,
  }
}

/** Maps free-form interval labels ("1 YEAR", "per-year-salary", "per-hour-wage") to an interval. */
export function parseSalaryInterval(label: string | null | undefined): SalaryInterval | null {
  const match = /year|annual|month|week|day|hour/i.exec(label ?? '')?.[0].toLowerCase()
  switch (match) {
    case 'year':
    case 'annual': {
      return 'YEAR'
    }
    case 'month': {
      return 'MONTH'
    }
    case 'week': {
      return 'WEEK'
    }
    case 'day': {
      return 'DAY'
    }
    case 'hour': {
      return 'HOUR'
    }
    default: {
      return null
    }
  }
}
