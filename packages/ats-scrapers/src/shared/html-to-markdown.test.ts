import { describe, expect, it } from 'vitest'

import { htmlToMarkdown } from './html-to-markdown'

describe('htmlToMarkdown', () => {
  it('converts headings, lists, emphasis and links', () => {
    const html =
      '<h3>About</h3><p>We are <strong>remote</strong>. <a href="https://acme.dev">Site</a></p><ul><li>One</li><li>Two</li></ul>'
    expect(htmlToMarkdown(html)).toBe(
      '### About\n\nWe are **remote**. [Site](https://acme.dev)\n\n-   One\n-   Two',
    )
  })

  it('drops scripts and styles', () => {
    expect(htmlToMarkdown('<style>p{}</style><p>Hi</p><script>alert(1)</script>')).toBe('Hi')
  })

  it('returns null for empty input', () => {
    expect(htmlToMarkdown('')).toBeNull()
    expect(htmlToMarkdown('<p> </p>')).toBeNull()
    expect(htmlToMarkdown(null)).toBeNull()
  })
})
