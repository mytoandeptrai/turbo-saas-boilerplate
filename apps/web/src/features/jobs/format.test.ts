import { describe, expect, it } from 'vitest'

import { formatSalaryAmount, postedAge } from './format'

describe('formatSalaryAmount', () => {
  it('formats a USD range', () => {
    expect(formatSalaryAmount(5000, 8500, 'USD')).toBe('$5k – $8.5k')
  })

  it('formats open-ended and single amounts', () => {
    expect(formatSalaryAmount(3000, null, 'USD')).toBe('$3k+')
    expect(formatSalaryAmount(null, 4000, null)).toBe('$4k')
    expect(formatSalaryAmount(900, 900, 'USD')).toBe('$900')
  })

  it('prefixes other currencies with their code', () => {
    expect(formatSalaryAmount(4000, 6000, 'EUR')).toBe('EUR 4k – EUR 6k')
  })

  it('returns null without salary data', () => {
    expect(formatSalaryAmount(null, null, 'USD')).toBeNull()
  })
})

describe('postedAge', () => {
  const now = new Date('2026-11-22T12:00:00Z')

  it('picks the largest whole unit', () => {
    expect(postedAge('2026-11-22T01:00:00Z', now)).toEqual({ unit: 'today', count: 0 })
    expect(postedAge('2026-11-19T12:00:00Z', now)).toEqual({ unit: 'days', count: 3 })
    expect(postedAge('2026-09-01T00:00:00Z', now)).toEqual({ unit: 'months', count: 2 })
    expect(postedAge('2024-11-01T00:00:00Z', now)).toEqual({ unit: 'years', count: 2 })
  })

  it('returns null for missing or invalid dates', () => {
    expect(postedAge(null, now)).toBeNull()
    expect(postedAge('not a date', now)).toBeNull()
  })
})
