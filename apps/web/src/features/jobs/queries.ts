import 'server-only'
import { db } from '@/lib/db'

import { buildJobWhere } from './filters'

import type { JobFilters } from './filters'
import type { JobCounts, JobListItem } from './types'
import type { Prisma } from '@workspace/database'

const listSelect = {
  slug: true,
  title: true,
  department: true,
  locationRaw: true,
  remoteScope: true,
  minSalary: true,
  maxSalary: true,
  currency: true,
  techTags: true,
  applyUrl: true,
  publishedAt: true,
  company: { select: { name: true } },
} satisfies Prisma.JobSelect

type JobRow = Prisma.JobGetPayload<{ select: typeof listSelect }>

function toListItem({ company, publishedAt, ...job }: JobRow): JobListItem {
  return { ...job, companyName: company.name, publishedAt: publishedAt?.toISOString() ?? null }
}

const ACTIVE = { isActive: true, company: { isActive: true } } satisfies Prisma.JobWhereInput

export async function getJobCounts(): Promise<JobCounts> {
  const [worldwide, apac] = await Promise.all([
    db.job.count({ where: { ...ACTIVE, remoteScope: 'WORLDWIDE' } }),
    db.job.count({ where: { ...ACTIVE, remoteScope: 'APAC_FRIENDLY' } }),
  ])
  return { worldwide, apac }
}

export async function listJobs(
  filters: JobFilters,
): Promise<{ items: JobListItem[]; total: number }> {
  const where = buildJobWhere(filters)
  const [rows, total] = await Promise.all([
    db.job.findMany({
      where,
      select: listSelect,
      orderBy: [
        { isFeatured: 'desc' },
        { publishedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'asc' },
      ],
      take: filters.show,
    }),
    db.job.count({ where }),
  ])
  return { items: rows.map((row) => toListItem(row)), total }
}

export async function getJobBySlug(
  slug: string,
): Promise<{ job: JobListItem; description: string | null } | null> {
  const row = await db.job.findFirst({
    where: { ...ACTIVE, slug },
    select: { ...listSelect, description: true },
  })
  if (!row) return null
  const { description, ...job } = row
  return { job: toListItem(job), description }
}
