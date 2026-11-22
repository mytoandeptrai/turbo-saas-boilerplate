import { useFormatter, useTranslations } from 'next-intl'

import type { JobCounts } from '@/features/jobs/types'

function Counter({ value, label, dotClass }: { value: number; label: string; dotClass: string }) {
  const format = useFormatter()

  return (
    <div className="flex items-baseline gap-2">
      <span aria-hidden className={`size-1.5 -translate-y-0.5 rounded-full ${dotClass}`} />
      <span className="text-lg font-semibold text-foreground tabular-nums">
        {format.number(value)}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

export function Hero({ counts }: { counts: JobCounts }) {
  const t = useTranslations('Hero')

  return (
    <section className="pt-12 pb-10 sm:pt-20 sm:pb-12">
      <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.1]">
        {t('title')}
      </h1>
      <p className="mt-4 max-w-2xl text-pretty text-muted-foreground">{t('subtitle')}</p>
      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2">
        <Counter value={counts.worldwide} label={t('worldwideJobs')} dotClass="bg-emerald-400" />
        <Counter value={counts.apac} label={t('apacJobs')} dotClass="bg-sky-400" />
      </div>
    </section>
  )
}
