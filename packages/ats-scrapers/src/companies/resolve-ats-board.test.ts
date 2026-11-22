import { describe, expect, it, vi } from 'vitest'

import { resolveAtsBoard } from './resolve-ats-board'

function htmlResponse(html: string, url = ''): Response {
  const response = new Response(html, { headers: { 'content-type': 'text/html' } })
  Object.defineProperty(response, 'url', { value: url })
  return response
}

describe('resolveAtsBoard', () => {
  it('resolves hosted ATS links without any network call', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    await expect(
      resolveAtsBoard('https://jobs.ashbyhq.com/a-team', { fetch: fetchMock }),
    ).resolves.toEqual({ provider: 'ASHBY', slug: 'a-team' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('finds an ATS embed in a custom career page', async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        htmlResponse(
          '<script src="https://boards.greenhouse.io/embed/job_board/js?for=acme"></script>',
        ),
      ),
    )
    await expect(
      resolveAtsBoard('https://acme.dev/careers', { fetch: fetchMock }),
    ).resolves.toEqual({ provider: 'GREENHOUSE', slug: 'acme' })
  })

  it('follows a redirect to a hosted board', async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(htmlResponse('<html></html>', 'https://jobs.lever.co/acme')),
    )
    await expect(
      resolveAtsBoard('https://acme.dev/careers', { fetch: fetchMock }),
    ).resolves.toEqual({ provider: 'LEVER', slug: 'acme' })
  })

  it('returns null when the page has no ATS, fails to load, or inspection is off', async () => {
    const plain = vi.fn<typeof fetch>(() => Promise.resolve(htmlResponse('<p>Email us</p>')))
    const failing = vi.fn<typeof fetch>(() => Promise.reject(new Error('timeout')))

    await expect(resolveAtsBoard('https://acme.dev/careers', { fetch: plain })).resolves.toBeNull()
    await expect(
      resolveAtsBoard('https://acme.dev/careers', { fetch: failing }),
    ).resolves.toBeNull()
    await expect(
      resolveAtsBoard('https://acme.dev/careers', { fetch: plain, inspectHtml: false }),
    ).resolves.toBeNull()
  })
})
