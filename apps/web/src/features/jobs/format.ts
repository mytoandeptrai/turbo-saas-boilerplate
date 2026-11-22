function compactAmount(amount: number): string {
  if (amount < 1000) return String(amount)
  const thousands = amount / 1000
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`
}

/** Formats a salary range without its period, e.g. "$5k – $8.5k" or "EUR 4k+". */
export function formatSalaryAmount(
  minSalary: number | null,
  maxSalary: number | null,
  currency: string | null,
): string | null {
  if (minSalary === null && maxSalary === null) return null
  const prefix = !currency || currency === 'USD' ? '$' : `${currency} `
  const amount = (value: number) => `${prefix}${compactAmount(value)}`

  if (minSalary !== null && maxSalary !== null && minSalary !== maxSalary) {
    return `${amount(minSalary)} – ${amount(maxSalary)}`
  }
  if (minSalary !== null && maxSalary === null) return `${amount(minSalary)}+`
  return amount((maxSalary ?? minSalary) as number)
}

const DAY_MS = 24 * 60 * 60 * 1000

export type PostedAge = { unit: 'today' | 'days' | 'months' | 'years'; count: number }

/** Age of a posting in its largest whole unit, for a translated "3d ago" style label. */
export function postedAge(publishedAt: string | null, now: Date = new Date()): PostedAge | null {
  if (!publishedAt) return null
  const days = Math.floor((now.getTime() - new Date(publishedAt).getTime()) / DAY_MS)
  if (Number.isNaN(days)) return null
  if (days <= 0) return { unit: 'today', count: 0 }
  if (days < 30) return { unit: 'days', count: days }
  if (days < 365) return { unit: 'months', count: Math.floor(days / 30) }
  return { unit: 'years', count: Math.floor(days / 365) }
}
