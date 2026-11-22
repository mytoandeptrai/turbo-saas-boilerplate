import { describe, expect, it } from 'vitest'

import { slugify } from './slugify'

describe('slugify', () => {
  it('lowercases and replaces separators with hyphens', () => {
    expect(slugify('10up Inc.')).toBe('10up-inc')
    expect(slugify('  A.Team  ')).toBe('a-team')
  })

  it('strips diacritics', () => {
    expect(slugify('Công ty Đại Việt')).toBe('cong-ty-dai-viet')
  })

  it('returns an empty string when nothing is sluggable', () => {
    expect(slugify('***')).toBe('')
  })
})
