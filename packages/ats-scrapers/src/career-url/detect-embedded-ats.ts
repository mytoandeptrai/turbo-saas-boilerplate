import { findAtsBoards } from './ats-board'

import type { AtsBoard } from '@/types'

/**
 * Scans a custom career page's HTML for an embedded ATS board (script, iframe or link).
 * When several boards are referenced, the most frequent one wins; ties go to the first seen.
 */
export function detectEmbeddedAts(html: string): AtsBoard | null {
  const counts = new Map<string, { board: AtsBoard; count: number }>()
  for (const board of findAtsBoards(html)) {
    const key = `${board.provider}:${board.slug.toLowerCase()}`
    const entry = counts.get(key)
    if (entry) entry.count += 1
    else counts.set(key, { board, count: 1 })
  }

  let best: { board: AtsBoard; count: number } | null = null
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry
  }
  return best?.board ?? null
}
