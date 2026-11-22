import { findAtsBoards } from './ats-board'

import type { AtsBoard } from '@/types'

/** Resolves the ATS provider and board slug from a hosted career-page URL. */
export function parseCareerUrl(url: string): AtsBoard | null {
  return findAtsBoards(url.trim())[0] ?? null
}
