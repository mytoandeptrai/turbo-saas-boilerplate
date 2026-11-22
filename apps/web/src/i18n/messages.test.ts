import { describe, expect, it } from 'vitest'

import en from '../../messages/en.json'
import vi from '../../messages/vi.json'

type MessageTree = { [key: string]: string | MessageTree }

function flatten(tree: MessageTree, prefix = ''): [path: string, message: string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [[`${prefix}${key}`, value]] : flatten(value, `${prefix}${key}.`),
  )
}

const placeholders = (message: string) => (message.match(/\{\w+/g) ?? []).toSorted()

describe('message dictionaries', () => {
  const english = new Map(flatten(en))
  const vietnamese = new Map(flatten(vi))

  it('define the same keys in every locale', () => {
    expect([...vietnamese.keys()].toSorted()).toEqual([...english.keys()].toSorted())
  })

  it('have no empty messages', () => {
    const empty = [...english, ...vietnamese].filter(([, message]) => message.trim() === '')
    expect(empty).toEqual([])
  })

  it('use the same placeholders in every locale', () => {
    const mismatched = [...english].filter(
      ([path, message]) =>
        placeholders(vietnamese.get(path) ?? '').join(',') !== placeholders(message).join(','),
    )
    expect(mismatched).toEqual([])
  })
})
