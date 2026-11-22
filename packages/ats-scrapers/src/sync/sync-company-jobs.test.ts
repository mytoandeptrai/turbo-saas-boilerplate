import { describe, expect, it } from 'vitest'

import { buildJobSlug, syncCompanyJobs } from './sync-company-jobs'

import type { JobStore } from './job-store'
import type { NormalizedJob } from '@/types'

function makeJob(externalId: string, title = 'Engineer'): NormalizedJob {
  return {
    externalId,
    title,
    department: null,
    locationRaw: 'Remote - Remote',
    remoteScope: 'WORLDWIDE',
    minSalary: null,
    maxSalary: null,
    currency: null,
    techTags: [],
    applyUrl: `https://ats.example/${externalId}/apply`,
    jobUrl: null,
    description: null,
    publishedAt: null,
  }
}

type StoredJob = { slug: string; title: string; isActive: boolean; lastVerifiedAt: Date }

function createFakeStore(seed: Record<string, StoredJob> = {}) {
  const jobs = new Map<string, StoredJob>(Object.entries(seed))
  const synced: { companyId: string; syncedAt: Date }[] = []
  const store: JobStore = {
    upsertJob: ({ slug, job, verifiedAt }) => {
      const existing = jobs.get(job.externalId)
      jobs.set(job.externalId, {
        slug: existing?.slug ?? slug,
        title: job.title,
        isActive: true,
        lastVerifiedAt: verifiedAt,
      })
      return Promise.resolve()
    },
    deactivateMissingJobs: (_companyId, activeExternalIds) => {
      let count = 0
      for (const [externalId, job] of jobs) {
        if (job.isActive && !activeExternalIds.includes(externalId)) {
          job.isActive = false
          count += 1
        }
      }
      return Promise.resolve(count)
    },
    markCompanySynced: (companyId, syncedAt) => {
      synced.push({ companyId, syncedAt })
      return Promise.resolve()
    },
  }
  return { store, jobs, synced }
}

const company = { id: 'c1', slug: 'acme' }
const now = new Date('2026-11-22T00:00:00Z')
const earlier = new Date('2026-11-01T00:00:00Z')

describe('buildJobSlug', () => {
  it('is stable and unique per external id', () => {
    const first = buildJobSlug('acme', { title: 'Senior Engineer (Remote)', externalId: '1' })
    expect(first).toMatch(/^acme-senior-engineer-remote-[\da-f]{8}$/)
    expect(buildJobSlug('acme', { title: 'Senior Engineer (Remote)', externalId: '1' })).toBe(first)
    expect(buildJobSlug('acme', { title: 'Senior Engineer (Remote)', externalId: '2' })).not.toBe(
      first,
    )
  })
})

describe('syncCompanyJobs', () => {
  it('inserts new jobs and stamps the company as synced', async () => {
    const { store, jobs, synced } = createFakeStore()

    const result = await syncCompanyJobs({
      company,
      fetchJobs: () => Promise.resolve([makeJob('1'), makeJob('2')]),
      store,
      now,
    })

    expect(result).toEqual({ upserted: 2, deactivated: 0 })
    expect([...jobs.keys()]).toEqual(['1', '2'])
    expect(jobs.get('1')).toMatchObject({ isActive: true, lastVerifiedAt: now })
    expect(synced).toEqual([{ companyId: 'c1', syncedAt: now }])
  })

  it('updates existing jobs without duplicating them and reactivates returning ones', async () => {
    const { store, jobs } = createFakeStore({
      '1': { slug: 'acme-old-1', title: 'Old title', isActive: false, lastVerifiedAt: earlier },
    })

    await syncCompanyJobs({
      company,
      fetchJobs: () => Promise.resolve([makeJob('1', 'New title')]),
      store,
      now,
    })

    expect(jobs.size).toBe(1)
    expect(jobs.get('1')).toEqual({
      slug: 'acme-old-1',
      title: 'New title',
      isActive: true,
      lastVerifiedAt: now,
    })
  })

  it('deactivates jobs that are no longer on the feed', async () => {
    const { store, jobs } = createFakeStore({
      '1': { slug: 'acme-1', title: 'Kept', isActive: true, lastVerifiedAt: earlier },
      '2': { slug: 'acme-2', title: 'Gone', isActive: true, lastVerifiedAt: earlier },
    })

    const result = await syncCompanyJobs({
      company,
      fetchJobs: () => Promise.resolve([makeJob('1', 'Kept')]),
      store,
      now,
    })

    expect(result).toEqual({ upserted: 1, deactivated: 1 })
    expect(jobs.get('1')?.isActive).toBe(true)
    expect(jobs.get('2')).toMatchObject({ isActive: false, lastVerifiedAt: earlier })
  })

  it('writes nothing when the feed download fails', async () => {
    const { store, jobs, synced } = createFakeStore({
      '1': { slug: 'acme-1', title: 'Kept', isActive: true, lastVerifiedAt: earlier },
    })

    await expect(
      syncCompanyJobs({
        company,
        fetchJobs: () => Promise.reject(new Error('feed responded 404')),
        store,
        now,
      }),
    ).rejects.toThrow('feed responded 404')

    expect(jobs.get('1')?.isActive).toBe(true)
    expect(synced).toEqual([])
  })
})
