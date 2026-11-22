#!/usr/bin/env node

/**
 * Syncs jobs for every active company with a resolved ATS board.
 *
 * Usage: pnpm --filter @workspace/ats-scrapers sync:jobs [company-slug ...]
 */

import { createPrismaClient } from '@workspace/database'
import { config } from 'dotenv'
import pLimit from 'p-limit'

import { createPrismaJobStore, fetchBoardJobs, syncCompanyJobs } from '../src/index'

config({ path: '.env' })

const SYNC_CONCURRENCY = 4

async function main() {
  if (!process.env['DATABASE_URL']) throw new Error('DATABASE_URL is not configured')
  const onlySlugs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))

  const prisma = createPrismaClient()
  try {
    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
        atsProvider: { not: 'CUSTOM' },
        atsSlug: { not: null },
        ...(onlySlugs.length > 0 && { slug: { in: onlySlugs } }),
      },
      orderBy: { name: 'asc' },
    })
    console.log(`Syncing ${companies.length} companies…`)

    const store = createPrismaJobStore(prisma)
    const limit = pLimit(SYNC_CONCURRENCY)
    const totals = { synced: 0, failed: 0, upserted: 0, deactivated: 0 }

    await Promise.all(
      companies.map((company) =>
        limit(async () => {
          const { atsProvider, atsSlug } = company
          if (atsProvider === 'CUSTOM' || !atsSlug) return
          try {
            const result = await syncCompanyJobs({
              company,
              fetchJobs: () => fetchBoardJobs({ provider: atsProvider, slug: atsSlug }),
              store,
            })
            totals.synced += 1
            totals.upserted += result.upserted
            totals.deactivated += result.deactivated
            console.log(
              `✓ ${company.name} [${atsProvider}:${atsSlug}] ${result.upserted} jobs, ${result.deactivated} deactivated`,
            )
          } catch (error) {
            totals.failed += 1
            const reason = error instanceof Error ? error.message.split('\n')[0] : String(error)
            console.warn(`✗ ${company.name} [${atsProvider}:${atsSlug}] ${reason}`)
          }
        }),
      ),
    )

    console.table(totals)
  } finally {
    await prisma.$disconnect()
  }
}

try {
  await main()
} catch (error) {
  console.error('Job sync failed:', error)
  process.exitCode = 1
}
