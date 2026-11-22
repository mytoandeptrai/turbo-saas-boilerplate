import { detectEmbeddedAts } from '@/career-url/detect-embedded-ats'
import { parseCareerUrl } from '@/career-url/parse-career-url'

import type { AtsBoard } from '@/types'

export type ResolveAtsBoardOptions = {
  /** Fetch custom career pages to look for an embedded ATS. */
  inspectHtml?: boolean
  fetch?: typeof fetch
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Resolves a career link to an ATS board: first from the URL itself, then (for custom
 * domains) from the page it redirects to or the ATS embed found in its HTML.
 * Returns null when the company stays on a custom career page.
 */
export async function resolveAtsBoard(
  careerUrl: string,
  options: ResolveAtsBoardOptions = {},
): Promise<AtsBoard | null> {
  const direct = parseCareerUrl(careerUrl)
  if (direct || options.inspectHtml === false) return direct

  try {
    const response = await (options.fetch ?? fetch)(careerUrl, {
      headers: { accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    })
    const redirected = parseCareerUrl(response.url)
    if (redirected) return redirected
    return response.ok ? detectEmbeddedAts(await response.text()) : null
  } catch {
    // Unreachable or slow career pages simply stay CUSTOM.
    return null
  }
}
