import type { NormalizedJob } from '@/types'

/** Persistence port used by the sync; the Prisma adapter lives in `prisma-job-store.ts`. */
export type JobStore = {
  /** Inserts or refreshes a job keyed by (companyId, externalId) and marks it active. */
  upsertJob: (input: {
    companyId: string
    slug: string
    job: NormalizedJob
    verifiedAt: Date
  }) => Promise<void>
  /** Deactivates the company's active jobs that are no longer on the feed; returns the count. */
  deactivateMissingJobs: (companyId: string, activeExternalIds: string[]) => Promise<number>
  markCompanySynced: (companyId: string, syncedAt: Date) => Promise<void>
}
