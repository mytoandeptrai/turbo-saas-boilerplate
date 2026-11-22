import type { RemoteScope } from '@workspace/database'

/** Evaluated in order: the first scope with a matching keyword wins. */
const SCOPE_RULES: readonly { scope: RemoteScope; keywords: readonly string[] }[] = [
  { scope: 'WORLDWIDE', keywords: ['Worldwide', 'Anywhere', 'Global', 'Remote - Remote'] },
  { scope: 'APAC_FRIENDLY', keywords: ['APAC', 'Vietnam', 'Singapore', 'GMT+7', 'Asia'] },
  {
    scope: 'RESTRICTED_US_EU',
    keywords: ['US Only', 'United States', 'North America', 'EU Only'],
  },
]

function toPattern(keyword: string, flags = 'i'): RegExp {
  const escaped = keyword.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, flags)
}

const COMPILED_RULES = SCOPE_RULES.map(({ scope, keywords }) => ({
  scope,
  patterns: keywords.map((keyword) => toPattern(keyword)),
}))

/** The label `buildLocationRaw` gives a remote job whose ATS location names no place. */
const BARE_REMOTE = /^remote - remote$/i

const TITLE_REGION_NAMES = [
  'Americas',
  'North America',
  'South America',
  'Latin America',
  'LATAM',
  'EMEA',
  'Europe',
  'Middle East',
  'Africa',
  'APAC',
  'Asia',
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'India',
  'Japan',
  'West Coast',
  'East Coast',
]
/**
 * Matched case-sensitively: "US" is a region, "us" is not. "SEA" is left out because it
 * also abbreviates search engine advertising.
 */
const TITLE_REGION_CODES = ['US', 'USA', 'EU', 'UK', 'AMER', 'ANZ', 'APJ', 'MENA', 'DACH']

const TITLE_REGION_PATTERNS = [
  ...TITLE_REGION_NAMES.map((name) => toPattern(name)),
  ...TITLE_REGION_CODES.map((code) => toPattern(code, '')),
]

/**
 * Classifies how location-restricted a remote job is, based on its raw location text.
 * A location that only says "remote" counts as worldwide unless the title names a region
 * ("Account Executive - EMEA"); such a job is left unverified.
 */
export function classifyRemoteScope(
  locationRaw: string | null | undefined,
  title?: string,
): RemoteScope {
  if (!locationRaw) return 'UNKNOWN'
  const titleNamesRegion = title && TITLE_REGION_PATTERNS.some((pattern) => pattern.test(title))
  if (titleNamesRegion && BARE_REMOTE.test(locationRaw)) return 'UNKNOWN'
  const match = COMPILED_RULES.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(locationRaw)),
  )
  return match?.scope ?? 'UNKNOWN'
}
