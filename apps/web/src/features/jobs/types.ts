export type RemoteScope = 'WORLDWIDE' | 'APAC_FRIENDLY' | 'RESTRICTED_US_EU' | 'UNKNOWN'

/** Job fields needed by a list row and the drawer header (serializable to client components). */
export type JobListItem = {
  slug: string
  title: string
  companyName: string
  department: string | null
  locationRaw: string | null
  remoteScope: RemoteScope
  minSalary: number | null
  maxSalary: number | null
  currency: string | null
  techTags: string[]
  applyUrl: string
  publishedAt: string | null
}

export type JobCounts = {
  worldwide: number
  apac: number
}
