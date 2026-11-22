import { describe, expect, it } from 'vitest'

import { parseCareerUrl } from './parse-career-url'

describe('parseCareerUrl', () => {
  it.each([
    ['https://jobs.ashbyhq.com/a-team', 'ASHBY', 'a-team'],
    ['https://jobs.ashbyhq.com/better-mortgage/', 'ASHBY', 'better-mortgage'],
    ['https://boards.greenhouse.io/alpaca', 'GREENHOUSE', 'alpaca'],
    ['https://job-boards.greenhouse.io/boldin', 'GREENHOUSE', 'boldin'],
    ['https://job-boards.eu.greenhouse.io/finnapp', 'GREENHOUSE', 'finnapp'],
    ['https://boards.greenhouse.io/embed/job_board?for=acme', 'GREENHOUSE', 'acme'],
    ['https://jobs.lever.co/Clearer', 'LEVER', 'Clearer'],
    ['https://jobs.lever.co/epoch-ai?team=Engineering', 'LEVER', 'epoch-ai'],
    ['https://apply.workable.com/cloudfactory/', 'WORKABLE', 'cloudfactory'],
    ['https://apply.workable.com/cxg/#jobs', 'WORKABLE', 'cxg'],
  ])('resolves %s', (url, provider, slug) => {
    expect(parseCareerUrl(url)).toEqual({ provider, slug })
  })

  it.each([
    'https://10up.com/careers',
    'https://actionvfx.bamboohr.com/careers',
    'https://apply.workable.com/j/B87C206E75',
    'https://jobs.lever.co/',
    '',
  ])('returns null for %s', (url) => {
    expect(parseCareerUrl(url)).toBeNull()
  })
})
