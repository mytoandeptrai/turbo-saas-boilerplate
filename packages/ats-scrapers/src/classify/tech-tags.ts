/**
 * Canonical tech keywords, in display order. Patterns are case-sensitive where the
 * keyword is also a common English word ("Go", "React", "Rust", "AI").
 */
// "Go" is also an everyday verb, so it only counts as "Golang", inside a language list
// ("Python, Go or Rust", "(Go/Rust)", "written in Go and Python") or as a role ("Go Engineer").
const GO_BEFORE = String.raw`(?:[,/(]\s?|\b(?:or|and|in|with)\s)`
const GO_AFTER = String.raw`(?=\s?[,/).;:]|\s(?:or|and)\s|\s*$)`
const GO_ROLE = String.raw`(?<![\w-])Go(?=\s?/\s?[A-Z]|\s(?:[Ee]ngineer|[Dd]eveloper|[Bb]ackend|[Pp]rogramm))`
const GO_PATTERN = new RegExp(
  [String.raw`\b[Gg]olang\b`, `${GO_BEFORE}Go${GO_AFTER}`, GO_ROLE].join('|'),
)

const TECH_TAG_PATTERNS: readonly { tag: string; pattern: RegExp }[] = [
  { tag: 'TypeScript', pattern: /\btypescript\b/i },
  { tag: 'React', pattern: /\bReact(?:\.?js)?\b|\bReactJS\b/ },
  { tag: 'Next.js', pattern: /\bnext\.?js\b/i },
  { tag: 'Node.js', pattern: /\bnode\.?js\b/i },
  { tag: 'NestJS', pattern: /\bnest\.?js\b/i },
  { tag: 'Go', pattern: GO_PATTERN },
  { tag: 'Rust', pattern: /\bRust\b/ },
  { tag: 'Python', pattern: /\bpython\b/i },
  { tag: 'Solidity', pattern: /\bsolidity\b/i },
  { tag: 'Web3', pattern: /\bweb3\b/i },
  { tag: 'Postgres', pattern: /\bpostgres(?:ql)?\b/i },
  { tag: 'Docker', pattern: /\bdocker\b/i },
  { tag: 'AWS', pattern: /\bAWS\b/ },
  { tag: 'AI', pattern: /\bAI\b/ },
  { tag: 'LLM', pattern: /\bLLMs?\b/ },
]

export const TECH_TAGS: readonly string[] = TECH_TAG_PATTERNS.map(({ tag }) => tag)

/** Extracts canonical tech tags mentioned in a job's title or description. */
export function extractTechTags(title: string, description?: string | null): string[] {
  const haystack = `${title}\n${description ?? ''}`
  return TECH_TAG_PATTERNS.filter(({ pattern }) => pattern.test(haystack)).map(({ tag }) => tag)
}
