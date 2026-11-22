import { AlertForm } from '@/features/alerts/alert-form'
import { Hero } from '@/features/jobs/components/hero'
import { JobBoard } from '@/features/jobs/components/job-board'
import { JobDescription } from '@/features/jobs/components/job-description'
import { parseJobFilters } from '@/features/jobs/filters'
import { getJobBySlug, getJobCounts, listJobs } from '@/features/jobs/queries'

import type { SearchParamsInput } from '@/features/jobs/filters'

export default async function HomePage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParamsInput> }>) {
  const params = await searchParams
  const filters = parseJobFilters(params)
  const openSlug = (Array.isArray(params['job']) ? params['job'][0] : params['job']) || null

  const [counts, { items, total }, openJob] = await Promise.all([
    getJobCounts(),
    listJobs(filters),
    openSlug ? getJobBySlug(openSlug) : null,
  ])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 sm:px-6">
      <header className="flex h-14 items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="size-2 rounded-full bg-emerald-400" />
          Remote APAC Jobs
        </span>
        <a
          href="#job-alerts"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Get job alerts
        </a>
      </header>

      <main id="main-content" className="flex-1 pb-16">
        <Hero counts={counts} />
        <JobBoard
          filters={filters}
          jobs={items}
          total={total}
          openSlug={openSlug}
          openJob={openJob?.job ?? null}
          description={<JobDescription markdown={openJob?.description ?? null} />}
        />
        <AlertForm />
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-6 text-xs text-muted-foreground">
        <span>Jobs are synced from public company ATS feeds. Applications go to the employer.</span>
        <span className="hidden sm:inline">
          <kbd className="font-sans">/</kbd> search · <kbd className="font-sans">j</kbd>{' '}
          <kbd className="font-sans">k</kbd> navigate · <kbd className="font-sans">↵</kbd> open
        </span>
      </footer>
    </div>
  )
}
