import { describe, expect, it } from 'vitest'

import { ONE, formatDecimal, multiply, parseDecimal, sum } from '@/modules/invoice/domain/decimal'

describe('decimal', () => {
  it('parses integers and fractions without precision loss', () => {
    expect(parseDecimal('1')).toBe(ONE)
    expect(parseDecimal(' 1234.5 ')).toBe(1_234_500_000n)
    expect(parseDecimal('-0.000001')).toBe(-1n)
    expect(formatDecimal(parseDecimal('99999999999999.99')!)).toBe('99999999999999.99')
  })

  it('rounds half up beyond six fractional digits', () => {
    expect(parseDecimal('0.0000005')).toBe(1n)
    expect(parseDecimal('0.0000004')).toBe(0n)
  })

  it.each(['', 'abc', '1,000', '1.2.3', '1e3', '10%', undefined, null])(
    'rejects non-numeric input %s',
    (input) => {
      expect(parseDecimal(input)).toBeNull()
    },
  )

  it('formats with the requested fraction digits', () => {
    expect(formatDecimal(parseDecimal('1250000')!)).toBe('1250000.00')
    expect(formatDecimal(parseDecimal('0.125')!, 2)).toBe('0.13')
    expect(formatDecimal(parseDecimal('-12.5')!, 0)).toBe('-13')
    expect(formatDecimal(parseDecimal('-0.001')!, 2)).toBe('0.00')
    expect(formatDecimal(parseDecimal('1.5')!, 6)).toBe('1.500000')
  })

  it('multiplies and sums exactly', () => {
    expect(multiply(parseDecimal('0.1')!, parseDecimal('0.2')!)).toBe(parseDecimal('0.02'))
    expect(multiply(parseDecimal('-3')!, parseDecimal('2.5')!)).toBe(parseDecimal('-7.5'))
    expect(sum([parseDecimal('0.1')!, parseDecimal('0.2')!])).toBe(parseDecimal('0.3'))
  })
})
