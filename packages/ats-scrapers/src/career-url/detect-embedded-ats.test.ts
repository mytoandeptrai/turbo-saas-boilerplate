import { describe, expect, it } from 'vitest'

import { detectEmbeddedAts } from './detect-embedded-ats'

describe('detectEmbeddedAts', () => {
  it('detects a Greenhouse embed script', () => {
    const html =
      '<div id="grnhse_app"></div><script src="https://boards.greenhouse.io/embed/job_board/js?for=acme"></script>'
    expect(detectEmbeddedAts(html)).toEqual({ provider: 'GREENHOUSE', slug: 'acme' })
  })

  it('detects an Ashby embed script', () => {
    const html = '<script src="https://jobs.ashbyhq.com/acme/embed"></script>'
    expect(detectEmbeddedAts(html)).toEqual({ provider: 'ASHBY', slug: 'acme' })
  })

  it('detects JSON-escaped Lever links', () => {
    const html = String.raw`{"href":"https:\/\/jobs.lever.co\/acme\/123"}`
    expect(detectEmbeddedAts(html)).toEqual({ provider: 'LEVER', slug: 'acme' })
  })

  it('prefers the most referenced board', () => {
    const html = `
      <a href="https://jobs.lever.co/partner">Partner</a>
      <a href="https://apply.workable.com/acme/j/1">One</a>
      <a href="https://apply.workable.com/acme/j/2">Two</a>`
    expect(detectEmbeddedAts(html)).toEqual({ provider: 'WORKABLE', slug: 'acme' })
  })

  it('ignores job-level Workable links without an account slug', () => {
    expect(detectEmbeddedAts('<a href="https://apply.workable.com/j/ABC123">Apply</a>')).toBeNull()
  })

  it('returns null when no ATS is referenced', () => {
    expect(detectEmbeddedAts('<html><body>We are hiring!</body></html>')).toBeNull()
  })
})
