import { decodeHTML } from 'entities'
import { z } from 'zod'

import { toDate } from './adapter'

import type { AtsAdapter } from './adapter'

const greenhouseFeedSchema = z.object({
  jobs: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      absolute_url: z.string(),
      location: z.object({ name: z.string().nullish() }).nullish(),
      departments: z.array(z.object({ name: z.string().nullish() })).nullish(),
      // Entity-escaped HTML; only present with `?content=true`.
      content: z.string().nullish(),
      first_published: z.string().nullish(),
      updated_at: z.string().nullish(),
    }),
  ),
})

export const greenhouseAdapter: AtsAdapter = {
  feedUrl: (slug) =>
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`,
  parseFeed: (payload) =>
    greenhouseFeedSchema.parse(payload).jobs.map((job) => ({
      externalId: String(job.id),
      title: job.title,
      department: job.departments?.[0]?.name ?? null,
      locations: job.location?.name ? [job.location.name] : [],
      // Greenhouse has no remote flag; remote boards spell it out in the location name.
      isRemote: false,
      descriptionHtml: job.content ? decodeHTML(job.content) : null,
      salary: null,
      applyUrl: job.absolute_url,
      jobUrl: job.absolute_url,
      publishedAt: toDate(job.first_published ?? job.updated_at),
    })),
}
