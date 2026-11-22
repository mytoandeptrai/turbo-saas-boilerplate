import { cn } from '@workspace/ui/lib/utils'

import { formatPostedAt, formatSalary } from '@/features/jobs/format'

import { ScopeBadge } from './scope-badge'

import type { JobListItem } from '@/features/jobs/types'

const MAX_TAGS = 3

type JobRowProps = {
  job: JobListItem
  href: string
  isActive: boolean
  onOpen: () => void
  onHover: () => void
  ref?: React.Ref<HTMLAnchorElement>
}

export function JobRow({ job, href, isActive, onOpen, onHover, ref }: JobRowProps) {
  const salary = formatSalary(job.minSalary, job.maxSalary, job.currency)
  const posted = formatPostedAt(job.publishedAt)

  return (
    <li>
      <a
        ref={ref}
        href={href}
        data-active={isActive || undefined}
        onMouseMove={onHover}
        onClick={(event) => {
          // Let the browser handle "open in new tab" clicks.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          onOpen()
        }}
        className={cn(
          'group relative flex items-center gap-4 border-b border-border/60 px-3 py-3 transition-colors outline-none',
          'focus-visible:bg-accent/60 data-active:bg-accent/60',
        )}
      >
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-foreground opacity-0 group-data-active:opacity-100"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{job.title}</span>
            <div className="hidden shrink-0 items-center gap-1 md:flex">
              {job.techTags.slice(0, MAX_TAGS).map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-border px-1.5 text-[11px] leading-4.5 text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {job.companyName}
            {job.locationRaw ? ` · ${job.locationRaw}` : ''}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          {salary ? (
            <span className="hidden text-foreground/80 tabular-nums sm:inline">{salary}</span>
          ) : null}
          <ScopeBadge scope={job.remoteScope} />
          {posted ? (
            <span className="hidden w-14 text-right tabular-nums sm:inline">{posted}</span>
          ) : null}
        </div>
      </a>
    </li>
  )
}
