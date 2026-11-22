import { describe, expect, it } from 'vitest'

import { subscribeSchema } from './subscribe-schema'

describe('subscribeSchema', () => {
  it('accepts an email only', () => {
    expect(subscribeSchema.parse({ email: ' Dev@Example.com ', telegram: '' })).toEqual({
      email: 'dev@example.com',
      telegram: null,
    })
  })

  it('accepts a Telegram handle only and normalizes it', () => {
    expect(subscribeSchema.parse({ email: '', telegram: 'Toan_Dev' })).toEqual({
      email: null,
      telegram: '@toan_dev',
    })
    expect(subscribeSchema.parse({ email: '', telegram: '@toan_dev' }).telegram).toBe('@toan_dev')
  })

  it('rejects an empty form', () => {
    const result = subscribeSchema.safeParse({ email: '', telegram: ' ' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('contactRequired')
  })

  it('rejects malformed contacts', () => {
    const email = subscribeSchema.safeParse({ email: 'nope', telegram: '' })
    expect(email.error?.issues[0]?.message).toBe('invalidEmail')
    const telegram = subscribeSchema.safeParse({ email: '', telegram: 'a b' })
    expect(telegram.error?.issues[0]?.message).toBe('invalidTelegram')
  })
})
