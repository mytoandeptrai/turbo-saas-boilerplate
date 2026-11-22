import { describe, expect, it, vi } from 'vitest'

import { ashbyAdapter } from './ashby'
import { fetchBoardJobs } from './fetch-board-jobs'
import { greenhouseAdapter } from './greenhouse'
import { leverAdapter } from './lever'
import { workableAdapter } from './workable'

describe('ashbyAdapter', () => {
  it('builds the posting API URL with compensation', () => {
    expect(ashbyAdapter.feedUrl('a-team')).toBe(
      'https://api.ashbyhq.com/posting-api/job-board/a-team?includeCompensation=true',
    )
  })

  it('maps listed jobs and prefers the USD salary tier', () => {
    const jobs = ashbyAdapter.parseFeed({
      jobs: [
        {
          id: 'job-1',
          title: 'Staff Engineer',
          department: 'Engineering',
          team: 'Platform',
          location: 'Remote',
          secondaryLocations: [{ location: 'Singapore' }],
          isListed: true,
          isRemote: true,
          workplaceType: 'Remote',
          address: { postalAddress: { addressCountry: 'Vietnam' } },
          publishedAt: '2026-10-15T14:28:12.608+00:00',
          jobUrl: 'https://jobs.ashbyhq.com/acme/job-1',
          applyUrl: 'https://jobs.ashbyhq.com/acme/job-1/application',
          descriptionHtml: '<p>Hello</p>',
          compensation: {
            compensationTiers: [
              {
                components: [
                  { compensationType: 'EquityPercentage', interval: 'NONE' },
                  {
                    compensationType: 'Salary',
                    interval: '1 YEAR',
                    currencyCode: 'MXN',
                    minValue: 568_000,
                    maxValue: 668_500,
                  },
                ],
              },
              {
                components: [
                  {
                    compensationType: 'Salary',
                    interval: '1 YEAR',
                    currencyCode: 'USD',
                    minValue: 90_000,
                    maxValue: 120_000,
                  },
                ],
              },
            ],
          },
        },
        {
          id: 'job-2',
          title: 'Hidden',
          isListed: false,
          jobUrl: 'https://jobs.ashbyhq.com/acme/job-2',
        },
      ],
    })

    expect(jobs).toEqual([
      {
        externalId: 'job-1',
        title: 'Staff Engineer',
        department: 'Engineering',
        locations: ['Remote', 'Singapore', 'Vietnam'],
        isRemote: true,
        descriptionHtml: '<p>Hello</p>',
        salary: { min: 90_000, max: 120_000, currency: 'USD', interval: 'YEAR' },
        applyUrl: 'https://jobs.ashbyhq.com/acme/job-1/application',
        jobUrl: 'https://jobs.ashbyhq.com/acme/job-1',
        publishedAt: new Date('2026-10-15T14:28:12.608Z'),
      },
    ])
  })

  it('rejects an unexpected payload', () => {
    expect(() => ashbyAdapter.parseFeed({ error: 'not found' })).toThrow()
  })
})

describe('greenhouseAdapter', () => {
  it('builds the boards API URL with content', () => {
    expect(greenhouseAdapter.feedUrl('goodnotes')).toBe(
      'https://boards-api.greenhouse.io/v1/boards/goodnotes/jobs?content=true',
    )
  })

  it('maps jobs and decodes the escaped HTML content', () => {
    const jobs = greenhouseAdapter.parseFeed({
      jobs: [
        {
          id: 6_234_324_004,
          title: 'Senior Cyber Security Engineer',
          absolute_url: 'https://job-boards.greenhouse.io/goodnotes/jobs/6234324004',
          location: { name: 'Singapore' },
          departments: [{ name: 'Security' }],
          content: '&lt;p&gt;Good &amp;amp; secure&lt;/p&gt;',
          first_published: '2026-10-26T06:43:52-04:00',
          updated_at: '2026-10-27T06:43:52-04:00',
        },
      ],
    })

    expect(jobs).toEqual([
      {
        externalId: '6234324004',
        title: 'Senior Cyber Security Engineer',
        department: 'Security',
        locations: ['Singapore'],
        isRemote: false,
        descriptionHtml: '<p>Good &amp; secure</p>',
        salary: null,
        applyUrl: 'https://job-boards.greenhouse.io/goodnotes/jobs/6234324004',
        jobUrl: 'https://job-boards.greenhouse.io/goodnotes/jobs/6234324004',
        publishedAt: new Date('2026-10-26T10:43:52Z'),
      },
    ])
  })
})

describe('leverAdapter', () => {
  it('builds the postings API URL in JSON mode', () => {
    expect(leverAdapter.feedUrl('epoch-ai')).toBe(
      'https://api.lever.co/v0/postings/epoch-ai?mode=json',
    )
  })

  it('maps postings, stitching description sections together', () => {
    const jobs = leverAdapter.parseFeed([
      {
        id: 'b71cd010',
        text: 'Design Lead',
        hostedUrl: 'https://jobs.lever.co/epoch-ai/b71cd010',
        applyUrl: 'https://jobs.lever.co/epoch-ai/b71cd010/apply',
        createdAt: 1_781_556_089_220,
        country: 'US',
        workplaceType: 'remote',
        categories: { team: 'Product & Design', location: 'Remote', allLocations: ['Remote'] },
        description: '<p>Intro</p>',
        lists: [{ text: 'Responsibilities', content: '<li>Lead</li>' }],
        additional: '<p>Outro</p>',
        salaryRange: { min: 150_000, max: 220_000, currency: 'USD', interval: 'per-year-salary' },
      },
    ])

    expect(jobs).toEqual([
      {
        externalId: 'b71cd010',
        title: 'Design Lead',
        department: 'Product & Design',
        locations: ['Remote', 'United States'],
        isRemote: true,
        descriptionHtml:
          '<p>Intro</p>\n<h3>Responsibilities</h3><ul><li>Lead</li></ul>\n<p>Outro</p>',
        salary: { min: 150_000, max: 220_000, currency: 'USD', interval: 'YEAR' },
        applyUrl: 'https://jobs.lever.co/epoch-ai/b71cd010/apply',
        jobUrl: 'https://jobs.lever.co/epoch-ai/b71cd010',
        publishedAt: new Date(1_781_556_089_220),
      },
    ])
  })

  it('returns no jobs for an empty board', () => {
    expect(leverAdapter.parseFeed([])).toEqual([])
  })
})

describe('workableAdapter', () => {
  it('builds the widget API URL with details', () => {
    expect(workableAdapter.feedUrl('cloudfactory')).toBe(
      'https://apply.workable.com/api/v1/widget/accounts/cloudfactory?details=true',
    )
  })

  it('maps jobs with their locations and remote flag', () => {
    const jobs = workableAdapter.parseFeed({
      name: 'CloudFactory',
      jobs: [
        {
          shortcode: 'B87C206E75',
          title: 'Computational Linguist',
          department: 'Operations',
          telecommuting: true,
          url: 'https://apply.workable.com/j/B87C206E75',
          application_url: 'https://apply.workable.com/j/B87C206E75/apply',
          published_on: '2026-10-28',
          country: 'United States',
          city: 'Texas City',
          state: 'Texas',
          locations: [{ country: 'United States', city: 'Texas City', region: 'Texas' }],
          description: '<h3>Who we are</h3>',
        },
      ],
    })

    expect(jobs).toEqual([
      {
        externalId: 'B87C206E75',
        title: 'Computational Linguist',
        department: 'Operations',
        locations: ['Texas City, Texas, United States'],
        isRemote: true,
        descriptionHtml: '<h3>Who we are</h3>',
        salary: null,
        applyUrl: 'https://apply.workable.com/j/B87C206E75/apply',
        jobUrl: 'https://apply.workable.com/j/B87C206E75',
        publishedAt: new Date('2026-10-28'),
      },
    ])
  })
})

describe('fetchBoardJobs', () => {
  it('fetches the provider feed and normalizes its jobs', async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json([
          {
            id: 'p1',
            text: 'Rust Engineer',
            hostedUrl: 'https://jobs.lever.co/acme/p1',
            workplaceType: 'remote',
            categories: { location: 'Remote' },
          },
        ]),
      ),
    )

    const jobs = await fetchBoardJobs({ provider: 'LEVER', slug: 'acme' }, { fetch: fetchMock })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.lever.co/v0/postings/acme?mode=json')
    expect(jobs).toMatchObject([
      {
        externalId: 'p1',
        title: 'Rust Engineer',
        locationRaw: 'Remote - Remote',
        remoteScope: 'WORLDWIDE',
        techTags: ['Rust'],
        applyUrl: 'https://jobs.lever.co/acme/p1/apply',
      },
    ])
  })

  it('throws when the feed responds with an error status', async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response('not found', { status: 404 })),
    )

    await expect(
      fetchBoardJobs({ provider: 'ASHBY', slug: 'missing' }, { fetch: fetchMock }),
    ).rejects.toThrow('ASHBY feed for "missing" responded 404')
  })
})
