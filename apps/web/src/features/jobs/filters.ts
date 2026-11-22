import { extractTechTags, TECH_TAGS } from '@workspace/ats-scrapers/tech-tags'

import type { Prisma } from '@workspace/database'

export const SALARY_FLOORS = [3000, 5000, 8000] as const
export const PAGE_SIZE = 50
export const MAX_SHOWN = 500

export type JobFilters = {
  /** Free-text search over title, company and tech tags. */
  q: string
  tags: string[]
  /** `apac` keeps only Worldwide and APAC-friendly jobs (the default). */
  region: 'apac' | 'all'
  /** Minimum monthly salary in USD. */
  minSalary: number | null
  /** How many rows to render. */
  show: number
}

export const DEFAULT_FILTERS: JobFilters = {
  q: '',
  tags: [],
  region: 'apac',
  minSalary: null,
  show: PAGE_SIZE,
}

export type SearchParamsInput = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

/** Reads filters from URL search params, ignoring anything unknown or malformed. */
export function parseJobFilters(params: SearchParamsInput): JobFilters {
  const requestedTags = new Set(
    first(params['tags'])
      .split(',')
      .map((tag) => tag.trim().toLowerCase()),
  )
  const salary = Number(first(params['salary']))
  const show = Number.parseInt(first(params['show']), 10)

  return {
    q: first(params['q']).trim().slice(0, 100),
    tags: TECH_TAGS.filter((tag) => requestedTags.has(tag.toLowerCase())),
    region: first(params['region']) === 'all' ? 'all' : 'apac',
    minSalary: SALARY_FLOORS.find((floor) => floor === salary) ?? null,
    show: Number.isFinite(show) ? Math.min(Math.max(show, PAGE_SIZE), MAX_SHOWN) : PAGE_SIZE,
  }
}

/** Serializes filters (and the open job, if any) to a query string, omitting defaults. */
export function buildJobSearch(filters: JobFilters, jobSlug?: string | null): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.tags.length > 0) params.set('tags', filters.tags.join(','))
  if (filters.region === 'all') params.set('region', 'all')
  if (filters.minSalary !== null) params.set('salary', String(filters.minSalary))
  if (filters.show > PAGE_SIZE) params.set('show', String(filters.show))
  if (jobSlug) params.set('job', jobSlug)
  const search = params.toString()
  return search ? `?${search}` : ''
}

export function toggleTag(tags: readonly string[], tag: string): string[] {
  return tags.includes(tag) ? tags.filter((current) => current !== tag) : [...tags, tag]
}

/** Translates filters to a Prisma `where` clause over active jobs. */
export function buildJobWhere(filters: JobFilters): Prisma.JobWhereInput {
  const and: Prisma.JobWhereInput[] = []

  if (filters.region === 'apac') {
    and.push({ remoteScope: { in: ['WORLDWIDE', 'APAC_FRIENDLY'] } })
  }
  // A job matches when it mentions any of the selected technologies.
  if (filters.tags.length > 0) and.push({ techTags: { hasSome: filters.tags } })
  if (filters.minSalary !== null) {
    and.push({
      currency: 'USD',
      OR: [
        { minSalary: { gte: filters.minSalary } },
        { minSalary: null, maxSalary: { gte: filters.minSalary } },
      ],
    })
  }
  if (filters.q) {
    const needle = filters.q.toLowerCase()
    // Aliases ("PostgreSQL", "golang") resolve to the canonical tag stored on the job.
    const aliasTags = new Set(extractTechTags(filters.q))
    const matchingTags = TECH_TAGS.filter(
      (tag) => tag.toLowerCase().includes(needle) || aliasTags.has(tag),
    )
    and.push({
      OR: [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { company: { name: { contains: filters.q, mode: 'insensitive' } } },
        ...(matchingTags.length > 0 ? [{ techTags: { hasSome: matchingTags } }] : []),
      ],
    })
  }

  return { isActive: true, company: { isActive: true }, AND: and }
}
