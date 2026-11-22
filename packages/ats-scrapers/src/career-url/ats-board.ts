import type { AtsBoard, SupportedAtsProvider } from '@/types'

const SLUG = String.raw`([A-Za-z0-9][\w.-]*)`
// HTML often embeds URLs inside JSON, where "/" is escaped as "\/".
const SEP = String.raw`\\?/`

const BOARD_PATTERNS: readonly { provider: SupportedAtsProvider; source: string }[] = [
  { provider: 'ASHBY', source: String.raw`jobs\.ashbyhq\.com${SEP}${SLUG}` },
  {
    provider: 'ASHBY',
    source: String.raw`api\.ashbyhq\.com${SEP}posting-api${SEP}job-board${SEP}${SLUG}`,
  },
  {
    provider: 'GREENHOUSE',
    source: String.raw`boards(?:\.eu)?\.greenhouse\.io${SEP}embed${SEP}job_(?:board|app)(?:${SEP}js)?\?for=${SLUG}`,
  },
  {
    provider: 'GREENHOUSE',
    source: String.raw`(?:job-boards|boards)(?:\.eu)?\.greenhouse\.io${SEP}${SLUG}`,
  },
  {
    provider: 'GREENHOUSE',
    source: String.raw`boards-api\.greenhouse\.io${SEP}v1${SEP}boards${SEP}${SLUG}`,
  },
  { provider: 'LEVER', source: String.raw`jobs\.lever\.co${SEP}${SLUG}` },
  { provider: 'LEVER', source: String.raw`api\.lever\.co${SEP}v0${SEP}postings${SEP}${SLUG}` },
  { provider: 'WORKABLE', source: String.raw`apply\.workable\.com${SEP}${SLUG}` },
  {
    provider: 'WORKABLE',
    source: String.raw`apply\.workable\.com${SEP}api${SEP}v1${SEP}widget${SEP}accounts${SEP}${SLUG}`,
  },
]

/** Path segments that sit where a board slug would be but are not one. */
const RESERVED_SLUGS = new Set(['embed', 'api', 'j', 'v1', 'boards', 'posting-api'])

/** Finds every ATS board reference in a URL or an HTML document, in order of appearance. */
export function findAtsBoards(text: string): AtsBoard[] {
  const found: (AtsBoard & { index: number })[] = []
  for (const { provider, source } of BOARD_PATTERNS) {
    for (const match of text.matchAll(new RegExp(source, 'gi'))) {
      const slug = match[1]?.replace(/[.-]+$/, '')
      if (slug && !RESERVED_SLUGS.has(slug.toLowerCase())) {
        found.push({ provider, slug, index: match.index })
      }
    }
  }
  return found
    .toSorted((a, b) => a.index - b.index)
    .map(({ provider, slug }) => ({ provider, slug }))
}
