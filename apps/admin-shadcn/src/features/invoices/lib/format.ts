const VND_FORMATTER = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

/** Formats a decimal string as Vietnamese money: "5400000.00" → "5.400.000 ₫" */
export function formatMoney(value: string | number | null | undefined, currency = 'VND'): string {
  if (value === null || value === undefined || value === '') return '—'
  const amount = Number(value)
  if (Number.isNaN(amount)) return '—'
  const formatted = VND_FORMATTER.format(amount)
  return currency === 'VND' ? `${formatted} ₫` : `${formatted} ${currency}`
}

/** Formats a quantity or unit price without a currency suffix */
export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const amount = Number(value)
  return Number.isNaN(amount) ? '—' : VND_FORMATTER.format(amount)
}

/** Formats an ISO date or date-time as dd/mm/yyyy without timezone shifts */
export function formatDate(value: string | null | undefined): string {
  const match = value ? ISO_DATE.exec(value) : null
  if (!match) return '—'
  return `${match[3]}/${match[2]}/${match[1]}`
}
