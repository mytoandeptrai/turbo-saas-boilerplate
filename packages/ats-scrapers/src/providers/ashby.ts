import { z } from 'zod'

import { parseSalaryInterval } from '@/classify/salary'

import { toDate } from './adapter'

import type { AtsAdapter } from './adapter'
import type { RawSalary } from '@/types'

const compensationComponentSchema = z.object({
  compensationType: z.string().nullish(),
  interval: z.string().nullish(),
  currencyCode: z.string().nullish(),
  minValue: z.number().nullish(),
  maxValue: z.number().nullish(),
})

const ashbyJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  department: z.string().nullish(),
  team: z.string().nullish(),
  location: z.string().nullish(),
  secondaryLocations: z.array(z.object({ location: z.string().nullish() })).nullish(),
  isListed: z.boolean().nullish(),
  isRemote: z.boolean().nullish(),
  workplaceType: z.string().nullish(),
  address: z
    .object({ postalAddress: z.object({ addressCountry: z.string().nullish() }).nullish() })
    .nullish(),
  publishedAt: z.string().nullish(),
  jobUrl: z.string(),
  applyUrl: z.string().nullish(),
  descriptionHtml: z.string().nullish(),
  compensation: z
    .object({
      compensationTiers: z
        .array(z.object({ components: z.array(compensationComponentSchema).nullish() }))
        .nullish(),
    })
    .nullish(),
})

const ashbyFeedSchema = z.object({ jobs: z.array(ashbyJobSchema) })

type AshbyJob = z.infer<typeof ashbyJobSchema>

/** Picks the base-salary range, preferring a USD tier when the posting has several. */
function pickSalary(job: AshbyJob): RawSalary | null {
  const salaries = (job.compensation?.compensationTiers ?? [])
    .flatMap((tier) => tier.components ?? [])
    .flatMap((component): RawSalary[] => {
      const interval = parseSalaryInterval(component.interval)
      const min = component.minValue ?? null
      const max = component.maxValue ?? null
      if (component.compensationType !== 'Salary' || !interval || (min === null && max === null)) {
        return []
      }
      return [{ min, max, currency: component.currencyCode ?? null, interval }]
    })
  return salaries.find((salary) => salary.currency === 'USD') ?? salaries[0] ?? null
}

export const ashbyAdapter: AtsAdapter = {
  feedUrl: (slug) =>
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`,
  parseFeed: (payload) =>
    ashbyFeedSchema
      .parse(payload)
      .jobs.filter((job) => job.isListed !== false)
      .map((job) => ({
        externalId: job.id,
        title: job.title,
        department: job.department ?? job.team ?? null,
        locations: [
          job.location,
          ...(job.secondaryLocations ?? []).map((secondary) => secondary.location),
          job.address?.postalAddress?.addressCountry,
        ].flatMap((place) => (place ? [place] : [])),
        isRemote: job.isRemote === true || job.workplaceType === 'Remote',
        descriptionHtml: job.descriptionHtml ?? null,
        salary: pickSalary(job),
        applyUrl: job.applyUrl ?? job.jobUrl,
        jobUrl: job.jobUrl,
        publishedAt: toDate(job.publishedAt),
      })),
}
