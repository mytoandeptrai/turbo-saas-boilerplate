import type { RemoteScope } from './types'

const SCOPE_LABELS: Record<RemoteScope, string> = {
  WORLDWIDE: 'Worldwide',
  APAC_FRIENDLY: 'APAC',
  RESTRICTED_US_EU: 'US / EU only',
  UNKNOWN: 'Region unverified',
}

export function remoteScopeLabel(scope: RemoteScope): string {
  return SCOPE_LABELS[scope]
}

function compactAmount(amount: number): string {
  if (amount < 1000) return String(amount)
  const thousands = amount / 1000
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`
}

/** Formats a monthly salary range, e.g. "$5k – $8.5k/mo" or "EUR 4k+/mo". */
export function formatSalary(
  minSalary: number | null,
  maxSalary: number | null,
  currency: string | null,
): string | null {
  if (minSalary === null && maxSalary === null) return null
  const prefix = !currency || currency === 'USD' ? '$' : `${currency} `
  const amount = (value: number) => `${prefix}${compactAmount(value)}`

  if (minSalary !== null && maxSalary !== null && minSalary !== maxSalary) {
    return `${amount(minSalary)} – ${amount(maxSalary)}/mo`
  }
  if (minSalary !== null && maxSalary === null) return `${amount(minSalary)}+/mo`
  return `${amount((maxSalary ?? minSalary) as number)}/mo`
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Short relative age of a posting, e.g. "today", "3d ago", "2mo ago". */
export function formatPostedAt(publishedAt: string | null, now: Date = new Date()): string | null {
  if (!publishedAt) return null
  const days = Math.floor((now.getTime() - new Date(publishedAt).getTime()) / DAY_MS)
  if (Number.isNaN(days)) return null
  if (days <= 0) return 'today'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
