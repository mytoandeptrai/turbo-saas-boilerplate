import type { RawJob } from '@/types'

/** Knows where one ATS vendor publishes a board's feed and how to read it. */
export type AtsAdapter = {
  feedUrl: (slug: string) => string
  /** Validates the feed payload and maps it to raw jobs; throws on an unexpected shape. */
  parseFeed: (payload: unknown) => RawJob[]
}

export function toDate(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
