import { describe, expect, it } from 'vitest'

import { buildLocationRaw, normalizeJob } from './normalize-job'

import type { RawJob } from './types'

const rawJob: RawJob = {
  externalId: 'abc',
  title: ' Senior TypeScript Engineer ',
  department: ' Engineering ',
  locations: ['Remote'],
  isRemote: true,
  descriptionHtml: '<p>Build with <strong>React</strong> and Postgres.</p>',
  salary: { min: 120_000, max: 180_000, currency: 'USD', interval: 'YEAR' },
  applyUrl: 'https://jobs.example.com/abc/apply',
  jobUrl: 'https://jobs.example.com/abc',
  publishedAt: new Date('2026-01-01T00:00:00Z'),
}

describe('buildLocationRaw', () => {
  it('joins on-site locations', () => {
    expect(buildLocationRaw(['Hanoi', ' Singapore ', 'Hanoi'], false)).toBe('Hanoi / Singapore')
    expect(buildLocationRaw([], false)).toBeNull()
  })

  it('prefixes remote jobs with their regions', () => {
    expect(buildLocationRaw(['Remote', 'United States'], true)).toBe('Remote - United States')
  })

  it('labels unrestricted remote jobs as "Remote - Remote"', () => {
    expect(buildLocationRaw(['Remote'], true)).toBe('Remote - Remote')
    expect(buildLocationRaw([], true)).toBe('Remote - Remote')
    expect(buildLocationRaw(['Remote'], false)).toBe('Remote - Remote')
  })

  it('does not double the prefix for locations already named "Remote ..."', () => {
    expect(buildLocationRaw(['Remote - US Only', 'United States'], true)).toBe(
      'Remote - US Only / United States',
    )
    expect(buildLocationRaw(['Remote (APAC)', 'Remote'], false)).toBe('Remote (APAC)')
  })
})

describe('normalizeJob', () => {
  it('classifies, tags and converts a raw job', () => {
    expect(normalizeJob(rawJob)).toEqual({
      externalId: 'abc',
      title: 'Senior TypeScript Engineer',
      department: 'Engineering',
      locationRaw: 'Remote - Remote',
      remoteScope: 'WORLDWIDE',
      minSalary: 10_000,
      maxSalary: 15_000,
      currency: 'USD',
      techTags: ['TypeScript', 'React', 'Postgres'],
      applyUrl: 'https://jobs.example.com/abc/apply',
      jobUrl: 'https://jobs.example.com/abc',
      description: 'Build with **React** and Postgres.',
      publishedAt: new Date('2026-01-01T00:00:00Z'),
    })
  })

  it('keeps optional fields null', () => {
    const job = normalizeJob({
      ...rawJob,
      department: null,
      locations: ['Berlin'],
      isRemote: false,
      descriptionHtml: null,
      salary: null,
    })
    expect(job).toMatchObject({
      department: null,
      locationRaw: 'Berlin',
      remoteScope: 'UNKNOWN',
      minSalary: null,
      maxSalary: null,
      currency: null,
      description: null,
      techTags: ['TypeScript'],
    })
  })
})
