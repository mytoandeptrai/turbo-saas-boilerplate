import TurndownService from 'turndown'

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
})
turndown.remove(['script', 'style', 'iframe', 'form', 'noscript'])

/** Converts an ATS HTML description to Markdown; returns null when nothing is left. */
export function htmlToMarkdown(html: string | null | undefined): string | null {
  if (!html?.trim()) return null
  const markdown = turndown
    .turndown(html)
    .replaceAll('\u00A0', ' ')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim()
  return markdown || null
}
