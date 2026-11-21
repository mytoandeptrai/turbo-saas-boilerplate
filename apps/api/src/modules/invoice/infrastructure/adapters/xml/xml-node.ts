/** Minimal helpers to read the plain-object tree produced by fast-xml-parser */
export type XmlNode = Record<string, unknown>

function isNode(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Walks nested elements; when an element repeats, the first occurrence wins. */
export function child(node: XmlNode | undefined, ...path: string[]): XmlNode | undefined {
  let current: unknown = node
  for (const key of path) {
    if (!isNode(current)) return undefined
    const next = current[key]
    current = Array.isArray(next) ? next[0] : next
  }
  return isNode(current) ? current : undefined
}

export function children(node: XmlNode | undefined, key: string): XmlNode[] {
  const value = node?.[key]
  if (value === undefined || value === null) return []
  return (Array.isArray(value) ? value : [value]).filter((entry) => isNode(entry))
}

/** Text content of a child element; undefined when absent or not a leaf. */
export function text(node: XmlNode | undefined, key: string): string | undefined {
  const value = node?.[key]
  const first: unknown = Array.isArray(value) ? value[0] : value
  if (typeof first === 'string') return first
  if (isNode(first) && typeof first['#text'] === 'string') return first['#text']
  return undefined
}
