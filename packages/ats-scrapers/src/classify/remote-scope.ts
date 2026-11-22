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

function toPattern(keyword: string): RegExp {
  const escaped = keyword.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'i')
}

const COMPILED_RULES = SCOPE_RULES.map(({ scope, keywords }) => ({
  scope,
  patterns: keywords.map((keyword) => toPattern(keyword)),
}))

/** Classifies how location-restricted a remote job is, based on its raw location text. */
export function classifyRemoteScope(locationRaw: string | null | undefined): RemoteScope {
  if (!locationRaw) return 'UNKNOWN'
  const match = COMPILED_RULES.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(locationRaw)),
  )
  return match?.scope ?? 'UNKNOWN'
}
