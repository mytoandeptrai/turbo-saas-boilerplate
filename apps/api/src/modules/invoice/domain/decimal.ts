/**
 * Fixed-point decimal arithmetic on BigInt (6 fractional digits).
 * Money must never go through IEEE-754 `number`.
 */
export const DECIMAL_SCALE = 6
const FACTOR = 10n ** BigInt(DECIMAL_SCALE)
const DECIMAL_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/

export type Decimal = bigint

export const ZERO: Decimal = 0n
/** One currency unit (e.g. 1 VND) */
export const ONE: Decimal = FACTOR

/** Parses a plain decimal string ("1234.50"). Returns null when the input is not a number. */
export function parseDecimal(input: string | null | undefined): Decimal | null {
  if (input === null || input === undefined) return null
  const match = DECIMAL_PATTERN.exec(input.trim())
  if (!match) return null

  const [, sign, whole, fraction = ''] = match
  const kept = fraction.slice(0, DECIMAL_SCALE).padEnd(DECIMAL_SCALE, '0')
  let value = BigInt(whole!) * FACTOR + BigInt(kept)
  // Round half up on the first dropped digit
  if (fraction.length > DECIMAL_SCALE && fraction.charAt(DECIMAL_SCALE) >= '5') value += 1n

  return sign === '-' ? -value : value
}

export function formatDecimal(value: Decimal, fractionDigits = 2): string {
  const drop = 10n ** BigInt(DECIMAL_SCALE - fractionDigits)
  const negative = value < 0n
  const absolute = negative ? -value : value
  const rounded = (absolute + drop / 2n) / drop
  const digits = rounded.toString().padStart(fractionDigits + 1, '0')
  const whole = digits.slice(0, digits.length - fractionDigits)
  const fraction = fractionDigits > 0 ? `.${digits.slice(-fractionDigits)}` : ''
  return `${negative && rounded !== 0n ? '-' : ''}${whole}${fraction}`
}

export function multiply(a: Decimal, b: Decimal): Decimal {
  const product = a * b
  const half = FACTOR / 2n
  return product >= 0n ? (product + half) / FACTOR : -((-product + half) / FACTOR)
}

export function abs(value: Decimal): Decimal {
  return value < 0n ? -value : value
}

export function sum(values: Decimal[]): Decimal {
  return values.reduce((total, value) => total + value, ZERO)
}
