import { classifyRemoteScope } from './classify/remote-scope'
import { toMonthlySalary } from './classify/salary'
import { extractTechTags } from './classify/tech-tags'
import { htmlToMarkdown } from './shared/html-to-markdown'

import type { NormalizedJob, RawJob } from './types'

function uniqueTrimmed(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

/**
 * Builds the raw location label. Remote jobs are prefixed with "Remote - "; a remote job
 * without any geographic restriction becomes "Remote - Remote" (classified as worldwide
 * unless the title names a region).
 */
export function buildLocationRaw(locations: readonly string[], isRemote: boolean): string | null {
  const places = uniqueTrimmed(locations)
  const regions = places.filter((place) => !/^remote$/i.test(place))
  // A bare "Remote" location marks the job as remote even when the ATS has no remote flag.
  if (!isRemote && regions.length === places.length) {
    return places.length > 0 ? places.join(' / ') : null
  }
  if (regions.length === 0) return 'Remote - Remote'
  const label = regions.join(' / ')
  // "Remote - US Only" must not turn into "Remote - Remote - US Only".
  return /^remote\b/i.test(label) ? label : `Remote - ${label}`
}

/** Applies location, salary, tech-tag and Markdown normalization to a raw ATS job. */
export function normalizeJob(raw: RawJob): NormalizedJob {
  const title = raw.title.trim()
  const locationRaw = buildLocationRaw(raw.locations, raw.isRemote)
  const description = htmlToMarkdown(raw.descriptionHtml)
  return {
    externalId: raw.externalId,
    title,
    department: raw.department?.trim() || null,
    locationRaw,
    remoteScope: classifyRemoteScope(locationRaw, title),
    ...toMonthlySalary(raw.salary),
    techTags: extractTechTags(title, description),
    applyUrl: raw.applyUrl,
    jobUrl: raw.jobUrl,
    description,
    publishedAt: raw.publishedAt,
  }
}
