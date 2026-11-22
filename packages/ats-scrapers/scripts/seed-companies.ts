#!/usr/bin/env node

/**
 * Seeds the Company table from the remote-companies CSV.
 *
 * Each "Link Career" URL is resolved to an ATS provider + board slug; custom career
 * pages are fetched once to look for an ATS embed and otherwise stored as CUSTOM.
 *
 * Usage: pnpm --filter @workspace/ats-scrapers seed:companies [path/to/companies.csv] [--no-inspect]
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { createPrismaClient } from '@workspace/database'
import { config } from 'dotenv'
import pLimit from 'p-limit'

import { parseCompaniesCsv, resolveAtsBoard } from '../src/index'

config({ path: '.env' })

const DEFAULT_CSV = path.resolve(import.meta.dirname, '../data/remote_companies_easy.csv')
const INSPECT_CONCURRENCY = 8

async function main() {
  const args = process.argv.slice(2)
  const inspectHtml = !args.includes('--no-inspect')
  const csvPath =
    args.find((arg) => !arg.startsWith('--')) ?? process.env['COMPANIES_CSV'] ?? DEFAULT_CSV

  if (!process.env['DATABASE_URL']) throw new Error('DATABASE_URL is not configured')

  const rows = parseCompaniesCsv(await readFile(csvPath, 'utf8'))
  console.log(`Read ${rows.length} companies from ${csvPath}`)

  const limit = pLimit(INSPECT_CONCURRENCY)
  const resolved = await Promise.all(
    rows.map((row) =>
      limit(async () => ({ row, board: await resolveAtsBoard(row.careerUrl, { inspectHtml }) })),
    ),
  )

  const prisma = createPrismaClient()
  const counts: Record<string, number> = {}
  try {
    for (const { row, board } of resolved) {
      const ats = board ? { atsProvider: board.provider, atsSlug: board.slug } : null
      await prisma.company.upsert({
        where: { slug: row.slug },
        create: { ...row, ...(ats ?? { atsProvider: 'CUSTOM' as const }) },
        // A page that failed to load this run must not downgrade a previously resolved ATS.
        update: { ...row, ...ats },
      })
      const provider = board?.provider ?? 'CUSTOM'
      counts[provider] = (counts[provider] ?? 0) + 1
    }
  } finally {
    await prisma.$disconnect()
  }

  console.log(`Upserted ${resolved.length} companies`)
  console.table(counts)
}

try {
  await main()
} catch (error) {
  console.error('Seeding companies failed:', error)
  process.exitCode = 1
}
