import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { ArrowUpRightIcon } from 'lucide-react'

import { formatPostedAt, formatSalary } from '@/features/jobs/format'

import { ScopeBadge } from './scope-badge'

import type { JobListItem } from '@/features/jobs/types'

type JobDrawerProps = {
  open: boolean
  /** Header data; null when the linked job no longer exists. */
  job: JobListItem | null
  /** Server-rendered description, or null while it is loading. */
  description: React.ReactNode | null
  onClose: () => void
}

function DescriptionSkeleton() {
  return (
    <div aria-busy className="animate-pulse space-y-3">
      {['w-11/12', 'w-full', 'w-10/12', 'w-9/12', 'w-full', 'w-8/12'].map((width, index) => (
        // eslint-disable-next-line react/no-array-index-key -- static placeholder rows
        <div key={index} className={`h-3 rounded bg-muted ${width}`} />
      ))}
    </div>
  )
}

export function JobDrawer({ open, job, description, onClose }: JobDrawerProps) {
  const salary = job ? formatSalary(job.minSalary, job.maxSalary, job.currency) : null
  const posted = job ? formatPostedAt(job.publishedAt) : null

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        side="right"
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
      >
        {job ? (
          <>
            <SheetHeader className="gap-3 border-b border-border p-6 pr-14">
              <SheetDescription className="text-xs">
                {job.companyName}
                {job.department ? ` · ${job.department}` : ''}
              </SheetDescription>
              <SheetTitle className="text-xl leading-snug font-semibold tracking-tight">
                {job.title}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                <ScopeBadge scope={job.remoteScope} />
                {job.locationRaw ? <span>{job.locationRaw}</span> : null}
                {salary ? <span className="text-foreground/80 tabular-nums">{salary}</span> : null}
                {posted ? <span>Posted {posted}</span> : null}
              </div>
              {job.techTags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {job.techTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-border px-1.5 text-[11px] leading-4.5 text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6">
              {description ?? <DescriptionSkeleton />}
            </div>

            <div className="border-t border-border p-4 sm:px-6">
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-base font-semibold text-background transition-opacity outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Apply on Official ATS
                <ArrowUpRightIcon aria-hidden className="size-4.5" />
              </a>
            </div>
          </>
        ) : (
          <SheetHeader className="p-6 pr-14">
            <SheetTitle>This job is no longer available</SheetTitle>
            <SheetDescription>It was removed from the company&apos;s ATS feed.</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}
