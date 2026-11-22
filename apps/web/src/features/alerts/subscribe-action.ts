'use server'

import { db } from '@/lib/db'

import { SUBSCRIBE_ISSUES, subscribeSchema } from './subscribe-schema'

/** `Alerts.errors` translation key shown by the form. */
export type SubscribeErrorCode = (typeof SUBSCRIBE_ISSUES)[number] | 'saveFailed'

export type SubscribeState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: SubscribeErrorCode }

/** Stores job-alert contacts; submitting the same contact twice is a no-op. */
export async function subscribeToAlerts(
  _previous: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const parsed = subscribeSchema.safeParse({
    email: String(formData.get('email') ?? ''),
    telegram: String(formData.get('telegram') ?? ''),
  })
  if (!parsed.success) {
    const issue = SUBSCRIBE_ISSUES.find((code) => code === parsed.error.issues[0]?.message)
    return { status: 'error', code: issue ?? 'contactRequired' }
  }

  const { email, telegram } = parsed.data
  try {
    // One row per contact: a submission never changes a row someone else created.
    await Promise.all([
      email && db.jobAlertSubscriber.upsert({ where: { email }, update: {}, create: { email } }),
      telegram &&
        db.jobAlertSubscriber.upsert({ where: { telegram }, update: {}, create: { telegram } }),
    ])
    return { status: 'success' }
  } catch {
    return { status: 'error', code: 'saveFailed' }
  }
}
