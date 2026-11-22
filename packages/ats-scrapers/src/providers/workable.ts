import { z } from 'zod'

import { toDate } from './adapter'

import type { AtsAdapter } from './adapter'

const workableFeedSchema = z.object({
  jobs: z.array(
    z.object({
      shortcode: z.string(),
      title: z.string(),
      department: z.string().nullish(),
      telecommuting: z.boolean().nullish(),
      url: z.string(),
      application_url: z.string().nullish(),
      published_on: z.string().nullish(),
      city: z.string().nullish(),
      state: z.string().nullish(),
      country: z.string().nullish(),
      locations: z
        .array(
          z.object({
            city: z.string().nullish(),
            region: z.string().nullish(),
            country: z.string().nullish(),
          }),
        )
        .nullish(),
      // Only present with `?details=true`.
      description: z.string().nullish(),
    }),
  ),
})

function formatPlace(parts: readonly (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(', ')
}

export const workableAdapter: AtsAdapter = {
  feedUrl: (slug) =>
    `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}?details=true`,
  parseFeed: (payload) =>
    workableFeedSchema.parse(payload).jobs.map((job) => {
      const places = job.locations?.length
        ? job.locations.map((place) => formatPlace([place.city, place.region, place.country]))
        : [formatPlace([job.city, job.state, job.country])]
      return {
        externalId: job.shortcode,
        title: job.title,
        department: job.department || null,
        locations: places.filter(Boolean),
        isRemote: job.telecommuting === true,
        descriptionHtml: job.description ?? null,
        salary: null,
        applyUrl: job.application_url ?? job.url,
        jobUrl: job.url,
        publishedAt: toDate(job.published_on),
      }
    }),
}
