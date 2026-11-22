'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'

import { buildJobSearch, MAX_SHOWN, PAGE_SIZE } from '@/features/jobs/filters'

import { FilterBar } from './filter-bar'
import { JobDrawer } from './job-drawer'
import { JobRow } from './job-row'

import type { JobFilters } from '@/features/jobs/filters'
import type { JobListItem } from '@/features/jobs/types'

const SEARCH_DEBOUNCE_MS = 200

type JobBoardProps = {
  filters: JobFilters
  jobs: JobListItem[]
  total: number
  openSlug: string | null
  /** The open job as loaded by the server (it may not be part of the filtered list). */
  openJob: JobListItem | null
  /** Server-rendered description of `openSlug`. */
  description: React.ReactNode
}

type UrlState = { filters: JobFilters; openSlug: string | null }

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

export function JobBoard({ filters, jobs, total, openSlug, openJob, description }: JobBoardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  // The URL is the source of truth; this mirrors it instantly while the server responds.
  const [url, setOptimisticUrl] = useOptimistic<UrlState>({ filters, openSlug })
  const [draftQuery, setDraftQuery] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const searchRef = useRef<HTMLInputElement>(null)
  const rowRefs = useRef(new Map<string, HTMLAnchorElement>())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navigate = (next: UrlState, mode: 'push' | 'replace' = 'replace') => {
    startTransition(() => {
      setOptimisticUrl(next)
      router[mode](`${pathname}${buildJobSearch(next.filters, next.openSlug)}`, { scroll: false })
    })
  }

  const changeFilters = (nextFilters: JobFilters) => {
    clearTimeout(debounceRef.current ?? undefined)
    setDraftQuery(null)
    setActiveIndex(0)
    navigate({ filters: { ...nextFilters, show: PAGE_SIZE }, openSlug: null })
  }

  const changeQuery = (query: string) => {
    setDraftQuery(query)
    clearTimeout(debounceRef.current ?? undefined)
    debounceRef.current = setTimeout(() => {
      setActiveIndex(0)
      navigate({ filters: { ...url.filters, q: query.trim(), show: PAGE_SIZE }, openSlug: null })
    }, SEARCH_DEBOUNCE_MS)
  }

  const openAt = (index: number, mode: 'push' | 'replace') => {
    const job = jobs[index]
    if (!job) return
    setActiveIndex(index)
    navigate({ filters: url.filters, openSlug: job.slug }, mode)
  }

  // A job opened from a shared link or by click is where j/k continue from.
  const openIndex = url.openSlug ? jobs.findIndex((job) => job.slug === url.openSlug) : -1
  const currentIndex = openIndex === -1 ? activeIndex : openIndex

  const moveTo = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), jobs.length - 1)
    const job = jobs[nextIndex]
    if (!job) return
    setActiveIndex(nextIndex)
    rowRefs.current.get(job.slug)?.scrollIntoView({ block: 'nearest' })
    // With the drawer open, j/k flips through jobs without leaving it.
    if (url.openSlug) navigate({ filters: url.filters, openSlug: job.slug })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) {
        if (event.key === 'Escape') searchRef.current?.blur()
        return
      }
      switch (event.key) {
        case '/': {
          event.preventDefault()
          searchRef.current?.focus()
          break
        }
        case 'j': {
          moveTo(currentIndex + 1)
          break
        }
        case 'k': {
          moveTo(currentIndex - 1)
          break
        }
        case 'Enter':
        case 'o': {
          // Enter on a focused link or button keeps its native behavior.
          if (event.key === 'Enter' && event.target !== document.body) break
          if (!url.openSlug) openAt(currentIndex, 'push')
          break
        }
        default: {
          break
        }
      }
    }
    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => () => clearTimeout(debounceRef.current ?? undefined), [])

  // Back/forward restores an earlier search: drop the typed text so the box follows the URL.
  useEffect(() => {
    const onPopState = () => {
      clearTimeout(debounceRef.current ?? undefined)
      setDraftQuery(null)
    }
    globalThis.addEventListener('popstate', onPopState)
    return () => globalThis.removeEventListener('popstate', onPopState)
  }, [])

  const drawerJob = url.openSlug
    ? (jobs.find((job) => job.slug === url.openSlug) ??
      (openJob?.slug === url.openSlug ? openJob : null))
    : null
  // The description on hand belongs to the slug the server rendered, not the optimistic one.
  const descriptionReady = url.openSlug === openSlug

  return (
    <section aria-label="Jobs">
      <FilterBar
        filters={url.filters}
        query={draftQuery ?? url.filters.q}
        onQueryChange={changeQuery}
        onChange={changeFilters}
        searchRef={searchRef}
      />

      <div className="mt-8 flex items-center justify-between border-b border-border pb-2 text-xs text-muted-foreground">
        <span aria-live="polite" data-testid="job-count">
          {total.toLocaleString('en-US')} {total === 1 ? 'job' : 'jobs'}
        </span>
        <span className={isPending ? 'opacity-100' : 'opacity-0'} aria-hidden={!isPending}>
          Updating…
        </span>
      </div>

      {jobs.length > 0 ? (
        <ul className={isPending ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
          {jobs.map((job, index) => (
            <JobRow
              key={job.slug}
              ref={(element) => {
                if (element) rowRefs.current.set(job.slug, element)
                else rowRefs.current.delete(job.slug)
              }}
              job={job}
              href={`${pathname}${buildJobSearch(url.filters, job.slug)}`}
              isActive={index === currentIndex}
              onHover={() => setActiveIndex(index)}
              onOpen={() => openAt(index, 'push')}
            />
          ))}
        </ul>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No jobs match these filters. Try removing a tag or turning off “Worldwide &amp; APAC
          Only”.
        </p>
      )}

      {jobs.length < total && url.filters.show < MAX_SHOWN ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() =>
              navigate({
                filters: { ...url.filters, show: url.filters.show + PAGE_SIZE },
                openSlug: null,
              })
            }
            className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            Show more jobs
          </button>
        </div>
      ) : null}

      <JobDrawer
        open={url.openSlug !== null}
        job={drawerJob}
        description={descriptionReady ? description : null}
        onClose={() => navigate({ filters: url.filters, openSlug: null })}
      />
    </section>
  )
}
