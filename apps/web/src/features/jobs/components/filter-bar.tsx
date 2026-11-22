import { TECH_TAGS } from '@workspace/ats-scrapers/tech-tags'
import { cn } from '@workspace/ui/lib/utils'
import { SearchIcon } from 'lucide-react'

import { DEFAULT_FILTERS, SALARY_FLOORS, toggleTag } from '@/features/jobs/filters'

import type { JobFilters } from '@/features/jobs/filters'

type FilterBarProps = {
  filters: JobFilters
  query: string
  onQueryChange: (query: string) => void
  onChange: (filters: JobFilters) => void
  searchRef: React.Ref<HTMLInputElement>
}

const pillClass =
  'inline-flex h-7 items-center rounded-full border border-border px-2.5 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:border-foreground/40 aria-pressed:bg-accent aria-pressed:text-foreground'

export function FilterBar({ filters, query, onQueryChange, onChange, searchRef }: FilterBarProps) {
  const apacOnly = filters.region === 'apac'
  const hasFilters =
    query !== '' || filters.tags.length > 0 || !apacOnly || filters.minSalary !== null

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search jobs</span>
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={searchRef}
            type="search"
            name="q"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search title, company or tech…"
            autoComplete="off"
            className="h-10 w-full rounded-lg border border-border bg-input/30 pr-16 pl-9 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 items-center gap-1 text-[11px] text-muted-foreground sm:flex">
            <kbd className="rounded border border-border px-1.5 py-0.5 font-sans">⌘K</kbd>
            <kbd className="rounded border border-border px-1.5 py-0.5 font-sans">/</kbd>
          </span>
        </label>

        <button
          type="button"
          role="switch"
          aria-checked={apacOnly}
          onClick={() => onChange({ ...filters, region: apacOnly ? 'all' : 'apac' })}
          className="group flex h-10 shrink-0 items-center gap-2.5 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 aria-checked:text-foreground"
        >
          <span className="relative h-4 w-7 rounded-full bg-muted transition-colors group-aria-checked:bg-emerald-500">
            <span className="absolute top-0.5 left-0.5 size-3 rounded-full bg-background transition-transform group-aria-checked:translate-x-3" />
          </span>
          Worldwide &amp; APAC Only
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">Min salary</span>
        {SALARY_FLOORS.map((floor) => (
          <button
            key={floor}
            type="button"
            aria-pressed={filters.minSalary === floor}
            onClick={() =>
              onChange({ ...filters, minSalary: filters.minSalary === floor ? null : floor })
            }
            className={pillClass}
          >
            ${floor / 1000}k+
          </button>
        ))}
        <span className="text-xs text-muted-foreground">USD / month</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tech tags">
        {TECH_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            aria-pressed={filters.tags.includes(tag)}
            onClick={() => onChange({ ...filters, tags: toggleTag(filters.tags, tag) })}
            className={pillClass}
          >
            {tag}
          </button>
        ))}
        {hasFilters ? (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className={cn(pillClass, 'border-transparent underline-offset-4 hover:underline')}
          >
            Reset
          </button>
        ) : null}
      </div>
    </div>
  )
}
