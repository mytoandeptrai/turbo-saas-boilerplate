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
    expect(result.error?.issues[0]?.message).toBe('Enter an email or a Telegram handle')
  })

  it('rejects malformed contacts', () => {
    expect(subscribeSchema.safeParse({ email: 'nope', telegram: '' }).success).toBe(false)
    expect(subscribeSchema.safeParse({ email: '', telegram: 'a b' }).success).toBe(false)
  })
})
