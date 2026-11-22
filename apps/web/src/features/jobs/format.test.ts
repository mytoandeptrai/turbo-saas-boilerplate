import { describe, expect, it } from 'vitest'

import { formatPostedAt, formatSalary, remoteScopeLabel } from './format'

describe('formatSalary', () => {
  it('formats a USD range', () => {
    expect(formatSalary(5000, 8500, 'USD')).toBe('$5k – $8.5k/mo')
  })

  it('formats open-ended and single amounts', () => {
    expect(formatSalary(3000, null, 'USD')).toBe('$3k+/mo')
    expect(formatSalary(null, 4000, null)).toBe('$4k/mo')
    expect(formatSalary(900, 900, 'USD')).toBe('$900/mo')
  })

  it('prefixes other currencies with their code', () => {
    expect(formatSalary(4000, 6000, 'EUR')).toBe('EUR 4k – EUR 6k/mo')
  })

  it('returns null without salary data', () => {
    expect(formatSalary(null, null, 'USD')).toBeNull()
  })
})

describe('formatPostedAt', () => {
  const now = new Date('2026-11-22T12:00:00Z')

  it('formats relative ages', () => {
    expect(formatPostedAt('2026-11-22T01:00:00Z', now)).toBe('today')
    expect(formatPostedAt('2026-11-19T12:00:00Z', now)).toBe('3d ago')
    expect(formatPostedAt('2026-09-01T00:00:00Z', now)).toBe('2mo ago')
    expect(formatPostedAt('2024-11-01T00:00:00Z', now)).toBe('2y ago')
  })

  it('returns null for missing or invalid dates', () => {
    expect(formatPostedAt(null, now)).toBeNull()
    expect(formatPostedAt('not a date', now)).toBeNull()
  })
})

describe('remoteScopeLabel', () => {
  it('labels each scope', () => {
    expect(remoteScopeLabel('WORLDWIDE')).toBe('Worldwide')
    expect(remoteScopeLabel('APAC_FRIENDLY')).toBe('APAC')
  })
})
