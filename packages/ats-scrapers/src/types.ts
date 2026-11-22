import type { AtsProvider, RemoteScope } from '@workspace/database'

/** ATS vendors that expose a public JSON job feed. */
export type SupportedAtsProvider = Exclude<AtsProvider, 'CUSTOM'>

export type AtsBoard = {
  provider: SupportedAtsProvider
  slug: string
}

export type SalaryInterval = 'YEAR' | 'MONTH' | 'WEEK' | 'DAY' | 'HOUR'

export type RawSalary = {
  min: number | null
  max: number | null
  currency: string | null
  interval: SalaryInterval
}

/** Provider-agnostic job extracted from an ATS feed, before classification. */
export type RawJob = {
  externalId: string
  title: string
  department: string | null
  locations: string[]
  isRemote: boolean
  descriptionHtml: string | null
  salary: RawSalary | null
  applyUrl: string
  jobUrl: string | null
  publishedAt: Date | null
}

/** Job ready to be persisted (mirrors the `Job` table minus identity columns). */
export type NormalizedJob = {
  externalId: string
  title: string
  department: string | null
  locationRaw: string | null
  remoteScope: RemoteScope
  minSalary: number | null
  maxSalary: number | null
  currency: string | null
  techTags: string[]
  applyUrl: string
  jobUrl: string | null
  description: string | null
  publishedAt: Date | null
}
