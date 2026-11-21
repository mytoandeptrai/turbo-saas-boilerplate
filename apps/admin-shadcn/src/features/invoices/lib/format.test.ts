import { describe, expect, it } from 'vitest'

import { formatDate, formatMoney, formatNumber } from '@/features/invoices/lib/format'

describe('invoice formatters', () => {
  it('formats VND with dot thousands separators', () => {
    expect(formatMoney('5400000.00')).toBe('5.400.000 ₫')
    expect(formatMoney('0')).toBe('0 ₫')
    expect(formatMoney('-1500000.00')).toBe('-1.500.000 ₫')
  })

  it('keeps the currency code for foreign currencies', () => {
    expect(formatMoney('1234.5', 'USD')).toBe('1.234,5 USD')
  })

  it('returns a dash for missing or invalid amounts', () => {
    expect(formatMoney(null)).toBe('—')
    expect(formatMoney('abc')).toBe('—')
    expect(formatNumber(undefined)).toBe('—')
  })

  it('formats quantities with a decimal comma', () => {
    expect(formatNumber('2.5')).toBe('2,5')
  })

  it('formats dates as dd/mm/yyyy', () => {
    expect(formatDate('2026-03-12')).toBe('12/03/2026')
    expect(formatDate('2026-03-12T17:00:00.000Z')).toBe('12/03/2026')
    expect(formatDate(null)).toBe('—')
  })
})
