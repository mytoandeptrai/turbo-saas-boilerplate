import type { JobStore } from './job-store'
import type { PrismaClient } from '@workspace/database'

export function createPrismaJobStore(prisma: PrismaClient): JobStore {
  return {
    upsertJob: async ({ companyId, slug, job, verifiedAt }) => {
      const data = { ...job, isActive: true, lastVerifiedAt: verifiedAt }
      await prisma.job.upsert({
        where: { companyId_externalId: { companyId, externalId: job.externalId } },
        // The slug is only set on insert so public job URLs stay stable.
        create: { ...data, companyId, slug },
        update: data,
      })
    },
    deactivateMissingJobs: async (companyId, activeExternalIds) => {
      const { count } = await prisma.job.updateMany({
        where: { companyId, isActive: true, externalId: { notIn: activeExternalIds } },
        data: { isActive: false },
      })
      return count
    },
    markCompanySynced: async (companyId, syncedAt) => {
      await prisma.company.update({ where: { id: companyId }, data: { lastSyncedAt: syncedAt } })
    },
  }
}
