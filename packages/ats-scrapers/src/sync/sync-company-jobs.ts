import { createHash } from 'node:crypto'

import { slugify } from '@/shared/slugify'

import type { JobStore } from './job-store'
import type { NormalizedJob } from '@/types'

export type SyncableCompany = {
  id: string
  slug: string
}

export type SyncCompanyResult = {
  upserted: number
  deactivated: number
}

/** Stable, URL-safe job slug: company + title + a short hash of the ATS id. */
export function buildJobSlug(
  companySlug: string,
  job: Pick<NormalizedJob, 'title' | 'externalId'>,
) {
  const hash = createHash('sha256').update(job.externalId).digest('hex').slice(0, 8)
  return [companySlug, slugify(job.title).slice(0, 60), hash].filter(Boolean).join('-')
}

/**
 * Mirrors one company's ATS feed into the store: upserts every job on the feed and
 * deactivates the ones that disappeared. A failed feed download throws before any write.
 */
export async function syncCompanyJobs(params: {
  company: SyncableCompany
  fetchJobs: () => Promise<NormalizedJob[]>
  store: JobStore
  now?: Date
}): Promise<SyncCompanyResult> {
  const { company, fetchJobs, store } = params
  const now = params.now ?? new Date()
  const jobs = await fetchJobs()

  for (const job of jobs) {
    await store.upsertJob({
      companyId: company.id,
      slug: buildJobSlug(company.slug, job),
      job,
      verifiedAt: now,
    })
  }
  const deactivated = await store.deactivateMissingJobs(
    company.id,
    jobs.map((job) => job.externalId),
  )
  await store.markCompanySynced(company.id, now)

  return { upserted: jobs.length, deactivated }
}
