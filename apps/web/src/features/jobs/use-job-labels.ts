import { useTranslations } from 'next-intl'

import { formatSalaryAmount, postedAge } from './format'

import type { JobListItem } from './types'

/** Translated salary and posting-age labels for a job row or the detail drawer. */
export function useJobLabels(job: JobListItem | null): {
  salary: string | null
  posted: string | null
} {
  const t = useTranslations('Jobs')
  if (!job) return { salary: null, posted: null }

  const amount = formatSalaryAmount(job.minSalary, job.maxSalary, job.currency)
  const age = postedAge(job.publishedAt)
  return {
    salary: amount ? t('salaryPerMonth', { amount }) : null,
    posted: age ? t(`age.${age.unit}`, { count: age.count }) : null,
  }
}
