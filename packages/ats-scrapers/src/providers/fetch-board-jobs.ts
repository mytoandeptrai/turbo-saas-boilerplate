import { normalizeJob } from '@/normalize-job'

import { ashbyAdapter } from './ashby'
import { greenhouseAdapter } from './greenhouse'
import { leverAdapter } from './lever'
import { workableAdapter } from './workable'

import type { AtsAdapter } from './adapter'
import type { AtsBoard, NormalizedJob, SupportedAtsProvider } from '@/types'

export const ATS_ADAPTERS: Record<SupportedAtsProvider, AtsAdapter> = {
  ASHBY: ashbyAdapter,
  GREENHOUSE: greenhouseAdapter,
  LEVER: leverAdapter,
  WORKABLE: workableAdapter,
}

export type FetchBoardOptions = {
  fetch?: typeof fetch
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 30_000

/** Downloads a board's public JSON feed and returns its jobs, normalized. */
export async function fetchBoardJobs(
  board: AtsBoard,
  options: FetchBoardOptions = {},
): Promise<NormalizedJob[]> {
  const adapter = ATS_ADAPTERS[board.provider]
  const url = adapter.feedUrl(board.slug)
  const response = await (options.fetch ?? fetch)(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`${board.provider} feed for "${board.slug}" responded ${response.status}`)
  }
  return adapter.parseFeed(await response.json()).map((job) => normalizeJob(job))
}
