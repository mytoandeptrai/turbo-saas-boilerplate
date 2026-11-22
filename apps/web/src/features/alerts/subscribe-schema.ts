import { z } from 'zod'

const TELEGRAM_HANDLE = /^@?[A-Za-z]\w{4,31}$/

/** Issue messages are `Alerts.errors` translation keys. */
export const SUBSCRIBE_ISSUES = ['invalidEmail', 'invalidTelegram', 'contactRequired'] as const

/** Lead-magnet input: an email, a Telegram handle, or both. */
export const subscribeSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.union([z.literal(''), z.email('invalidEmail')])),
    telegram: z
      .string()
      .trim()
      .pipe(z.union([z.literal(''), z.string().regex(TELEGRAM_HANDLE, 'invalidTelegram')])),
  })
  .refine(({ email, telegram }) => email !== '' || telegram !== '', {
    message: 'contactRequired',
  })
  .transform(({ email, telegram }) => ({
    email: email || null,
    telegram: telegram ? `@${telegram.replace(/^@/, '').toLowerCase()}` : null,
  }))

export type SubscribeInput = z.output<typeof subscribeSchema>
