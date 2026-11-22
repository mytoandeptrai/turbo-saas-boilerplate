import { z } from 'zod'

import { parseSalaryInterval } from '@/classify/salary'

import { toDate } from './adapter'

import type { AtsAdapter } from './adapter'
import type { RawSalary } from '@/types'

const leverPostingSchema = z.object({
  id: z.string(),
  text: z.string(),
  hostedUrl: z.string(),
  applyUrl: z.string().nullish(),
  createdAt: z.number().nullish(),
  country: z.string().nullish(),
  workplaceType: z.string().nullish(),
  categories: z
    .object({
      team: z.string().nullish(),
      department: z.string().nullish(),
      location: z.string().nullish(),
      allLocations: z.array(z.string()).nullish(),
    })
    .nullish(),
  description: z.string().nullish(),
  lists: z.array(z.object({ text: z.string().nullish(), content: z.string().nullish() })).nullish(),
  additional: z.string().nullish(),
  salaryRange: z
    .object({
      min: z.number().nullish(),
      max: z.number().nullish(),
      currency: z.string().nullish(),
      interval: z.string().nullish(),
    })
    .nullish(),
})

const leverFeedSchema = z.array(leverPostingSchema)

type LeverPosting = z.infer<typeof leverPostingSchema>

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

/** Lever reports the hiring country as an ISO code ("US"); expand it to a readable name. */
function countryName(code: string | null | undefined): string | null {
  if (!code) return null
  try {
    return regionNames.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

function buildDescriptionHtml(posting: LeverPosting): string | null {
  const sections = [
    posting.description,
    ...(posting.lists ?? []).map(
      (list) => `<h3>${list.text ?? ''}</h3><ul>${list.content ?? ''}</ul>`,
    ),
    posting.additional,
  ].filter(Boolean)
  return sections.length > 0 ? sections.join('\n') : null
}

function pickSalary(posting: LeverPosting): RawSalary | null {
  const range = posting.salaryRange
  const interval = parseSalaryInterval(range?.interval)
  if (!range || !interval) return null
  return {
    min: range.min ?? null,
    max: range.max ?? null,
    currency: range.currency ?? null,
    interval,
  }
}

export const leverAdapter: AtsAdapter = {
  feedUrl: (slug) => `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
  parseFeed: (payload) =>
    leverFeedSchema.parse(payload).map((posting) => ({
      externalId: posting.id,
      title: posting.text,
      department: posting.categories?.team ?? posting.categories?.department ?? null,
      locations: [
        ...(posting.categories?.allLocations ?? [posting.categories?.location]),
        countryName(posting.country),
      ].flatMap((place) => (place ? [place] : [])),
      isRemote: posting.workplaceType === 'remote',
      descriptionHtml: buildDescriptionHtml(posting),
      salary: pickSalary(posting),
      applyUrl: posting.applyUrl ?? `${posting.hostedUrl}/apply`,
      jobUrl: posting.hostedUrl,
      publishedAt: toDate(posting.createdAt),
    })),
}
