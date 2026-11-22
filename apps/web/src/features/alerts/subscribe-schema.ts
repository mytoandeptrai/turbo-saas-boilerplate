import { z } from 'zod'

const TELEGRAM_HANDLE = /^@?[A-Za-z]\w{4,31}$/

/** Lead-magnet input: an email, a Telegram handle, or both. */
export const subscribeSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.union([z.literal(''), z.email('Enter a valid email address')])),
    telegram: z
      .string()
      .trim()
      .pipe(
        z.union([
          z.literal(''),
          z.string().regex(TELEGRAM_HANDLE, 'Enter a valid Telegram handle'),
        ]),
      ),
  })
  .refine(({ email, telegram }) => email !== '' || telegram !== '', {
    message: 'Enter an email or a Telegram handle',
  })
  .transform(({ email, telegram }) => ({
    email: email || null,
    telegram: telegram ? `@${telegram.replace(/^@/, '').toLowerCase()}` : null,
  }))

export type SubscribeInput = z.output<typeof subscribeSchema>
