import { cn } from '@workspace/ui/lib/utils'

import { remoteScopeLabel } from '@/features/jobs/format'

import type { RemoteScope } from '@/features/jobs/types'

const SCOPE_CLASSES: Record<RemoteScope, string> = {
  WORLDWIDE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  APAC_FRIENDLY: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  RESTRICTED_US_EU: 'border-border bg-transparent text-muted-foreground',
  UNKNOWN: 'border-border bg-transparent text-muted-foreground',
}

export function ScopeBadge({ scope, className }: { scope: RemoteScope; className?: string }) {
  return (
    <span
      data-scope={scope}
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[11px] font-medium whitespace-nowrap',
        SCOPE_CLASSES[scope],
        className,
      )}
    >
      {remoteScopeLabel(scope)}
    </span>
  )
}
