import { parse } from 'csv-parse/sync'

import { slugify } from '@/shared/slugify'

export type CompanyCsvRow = {
  name: string
  slug: string
  careerUrl: string
  linkedInUrl: string | null
  country: string | null
}

const COLUMNS = {
  name: 'Tên công ty',
  careerUrl: 'Link Career',
  linkedIn: 'LinkedIn',
  country: 'Country',
} as const

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/**
 * Parses the company list CSV (columns: Tên công ty, Link Career, LinkedIn, Country).
 * Rows without a name or an http(s) career link are skipped; slugs are made unique.
 */
export function parseCompaniesCsv(csv: string): CompanyCsvRow[] {
  const records = parse(csv, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string | undefined>[]

  const usedSlugs = new Set<string>()
  const rows: CompanyCsvRow[] = []
  for (const record of records) {
    const name = record[COLUMNS.name] ?? ''
    const careerUrl = record[COLUMNS.careerUrl] ?? ''
    const baseSlug = slugify(name)
    if (!baseSlug || !isHttpUrl(careerUrl)) continue

    let slug = baseSlug
    for (let suffix = 2; usedSlugs.has(slug); suffix += 1) slug = `${baseSlug}-${suffix}`
    usedSlugs.add(slug)

    const linkedIn = record[COLUMNS.linkedIn] ?? ''
    rows.push({
      name,
      slug,
      careerUrl,
      // The sheet export may hold a display name here instead of a link.
      linkedInUrl: isHttpUrl(linkedIn) ? linkedIn : null,
      country: record[COLUMNS.country] || null,
    })
  }
  return rows
}
