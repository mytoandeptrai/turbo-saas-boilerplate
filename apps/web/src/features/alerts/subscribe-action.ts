'use server'

import { db } from '@/lib/db'

import { subscribeSchema } from './subscribe-schema'

export type SubscribeState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

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
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid input' }
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
    return { status: 'error', message: 'Could not save your subscription. Please try again.' }
  }
}
