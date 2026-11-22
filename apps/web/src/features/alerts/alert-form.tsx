'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { subscribeToAlerts } from './subscribe-action'

import type { SubscribeState } from './subscribe-action'

const INITIAL_STATE: SubscribeState = { status: 'idle' }

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-input/30 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30'

export function AlertForm() {
  const t = useTranslations('Alerts')
  const [state, formAction, isPending] = useActionState(subscribeToAlerts, INITIAL_STATE)

  return (
    <section
      id="job-alerts"
      aria-labelledby="job-alerts-title"
      className="mt-16 scroll-mt-8 rounded-xl border border-border bg-card/40 p-6 sm:p-8"
    >
      <h2 id="job-alerts-title" className="text-lg font-semibold tracking-tight">
        {t('title')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>

      {state.status === 'success' ? (
        <p role="status" className="mt-5 text-sm font-medium text-emerald-400">
          {t('success')}
        </p>
      ) : (
        <form action={formAction} className="mt-5 flex flex-col gap-3 sm:flex-row" noValidate>
          <label className="flex-1">
            <span className="sr-only">{t('emailLabel')}</span>
            <input
              type="email"
              name="email"
              placeholder={t('emailPlaceholder')}
              autoComplete="email"
              className={inputClass}
            />
          </label>
          <label className="flex-1">
            <span className="sr-only">{t('telegramLabel')}</span>
            <input
              type="text"
              name="telegram"
              placeholder={t('telegramPlaceholder')}
              autoComplete="off"
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 shrink-0 rounded-lg bg-foreground px-5 text-sm font-semibold text-background transition-opacity outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
          >
            {isPending ? t('submitting') : t('submit')}
          </button>
        </form>
      )}
      {state.status === 'error' ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {t(`errors.${state.code}`)}
        </p>
      ) : null}
    </section>
  )
}
