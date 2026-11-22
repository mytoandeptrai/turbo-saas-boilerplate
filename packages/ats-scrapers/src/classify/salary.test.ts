import { describe, expect, it } from 'vitest'

import { parseSalaryInterval, toMonthlySalary } from './salary'

describe('toMonthlySalary', () => {
  it('converts a yearly range to monthly amounts', () => {
    expect(
      toMonthlySalary({ min: 150_000, max: 220_000, currency: 'usd', interval: 'YEAR' }),
    ).toEqual({
      minSalary: 12_500,
      maxSalary: 18_333,
      currency: 'USD',
    })
  })

  it('keeps monthly amounts and converts hourly ones', () => {
    expect(toMonthlySalary({ min: 3000, max: null, currency: 'USD', interval: 'MONTH' })).toEqual({
      minSalary: 3000,
      maxSalary: null,
      currency: 'USD',
    })
    expect(toMonthlySalary({ min: 30, max: 60, currency: 'USD', interval: 'HOUR' })).toEqual({
      minSalary: 5200,
      maxSalary: 10_400,
      currency: 'USD',
    })
  })

  it('returns nulls when there is no salary', () => {
    const none = { minSalary: null, maxSalary: null, currency: null }
    expect(toMonthlySalary(null)).toEqual(none)
    expect(toMonthlySalary({ min: null, max: null, currency: 'USD', interval: 'YEAR' })).toEqual(
      none,
    )
  })
})

describe('parseSalaryInterval', () => {
  it.each([
    ['1 YEAR', 'YEAR'],
    ['per-year-salary', 'YEAR'],
    ['1 MONTH', 'MONTH'],
    ['per-hour-wage', 'HOUR'],
    ['2 WEEK', 'WEEK'],
    ['1 DAY', 'DAY'],
  ])('maps %s to %s', (label, interval) => {
    expect(parseSalaryInterval(label)).toBe(interval)
  })

  it.each(['NONE', 'one-time', '', null, undefined])('returns null for %s', (label) => {
    expect(parseSalaryInterval(label)).toBeNull()
  })
})
