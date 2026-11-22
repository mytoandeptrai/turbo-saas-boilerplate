import { describe, expect, it } from 'vitest'

import {
  buildJobSearch,
  buildJobWhere,
  DEFAULT_FILTERS,
  parseJobFilters,
  toggleTag,
} from './filters'

describe('parseJobFilters', () => {
  it('defaults to Worldwide & APAC only with no other filter', () => {
    expect(parseJobFilters({})).toEqual(DEFAULT_FILTERS)
  })

  it('reads every filter from the URL', () => {
    expect(
      parseJobFilters({
        q: '  rust ',
        tags: 'react,next.js',
        region: 'all',
        salary: '5000',
        show: '150',
      }),
    ).toEqual({ q: 'rust', tags: ['React', 'Next.js'], region: 'all', minSalary: 5000, show: 150 })
  })

  it('ignores unknown tags, salary floors and regions', () => {
    expect(
      parseJobFilters({ tags: 'cobol,Go', region: 'mars', salary: '4200', show: '-3' }),
    ).toEqual({ ...DEFAULT_FILTERS, tags: ['Go'] })
  })

  it('uses the first value of a repeated param and caps the page size', () => {
    expect(parseJobFilters({ q: ['go', 'rust'], show: '99999' })).toEqual({
      ...DEFAULT_FILTERS,
      q: 'go',
      show: 500,
    })
  })
})

describe('buildJobSearch', () => {
  it('omits defaults', () => {
    expect(buildJobSearch(DEFAULT_FILTERS)).toBe('')
  })

  it('round-trips through parseJobFilters', () => {
    const filters = {
      q: 'senior engineer',
      tags: ['TypeScript', 'Node.js'],
      region: 'all' as const,
      minSalary: 8000,
      show: 100,
    }
    const search = buildJobSearch(filters, 'acme-engineer-1a2b3c4d')
    const params = Object.fromEntries(new URLSearchParams(search))

    expect(params['job']).toBe('acme-engineer-1a2b3c4d')
    expect(parseJobFilters(params)).toEqual(filters)
  })
})

describe('toggleTag', () => {
  it('adds and removes a tag', () => {
    expect(toggleTag(['Go'], 'Rust')).toEqual(['Go', 'Rust'])
    expect(toggleTag(['Go', 'Rust'], 'Go')).toEqual(['Rust'])
  })
})

describe('buildJobWhere', () => {
  it('only lists active Worldwide and APAC-friendly jobs by default', () => {
    expect(buildJobWhere(DEFAULT_FILTERS)).toEqual({
      isActive: true,
      company: { isActive: true },
      AND: [{ remoteScope: { in: ['WORLDWIDE', 'APAC_FRIENDLY'] } }],
    })
  })

  it('drops the region restriction when showing all regions', () => {
    expect(buildJobWhere({ ...DEFAULT_FILTERS, region: 'all' }).AND).toEqual([])
  })

  it('filters by tags and a USD salary floor', () => {
    expect(
      buildJobWhere({ ...DEFAULT_FILTERS, region: 'all', tags: ['Go', 'Rust'], minSalary: 5000 })
        .AND,
    ).toEqual([
      { techTags: { hasSome: ['Go', 'Rust'] } },
      {
        currency: 'USD',
        OR: [{ minSalary: { gte: 5000 } }, { minSalary: null, maxSalary: { gte: 5000 } }],
      },
    ])
  })

  it('searches title, company and matching tech tags', () => {
    expect(buildJobWhere({ ...DEFAULT_FILTERS, region: 'all', q: 'Post' }).AND).toEqual([
      {
        OR: [
          { title: { contains: 'Post', mode: 'insensitive' } },
          { company: { name: { contains: 'Post', mode: 'insensitive' } } },
          { techTags: { hasSome: ['Postgres'] } },
        ],
      },
    ])
  })

  it('searches only title and company when no tag matches', () => {
    expect(buildJobWhere({ ...DEFAULT_FILTERS, region: 'all', q: 'acme' }).AND).toEqual([
      {
        OR: [
          { title: { contains: 'acme', mode: 'insensitive' } },
          { company: { name: { contains: 'acme', mode: 'insensitive' } } },
        ],
      },
    ])
  })
})
