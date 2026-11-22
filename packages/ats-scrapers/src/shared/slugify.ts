/** Lowercase ASCII slug; strips diacritics (incl. Vietnamese "đ"). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .replaceAll(/[đĐ]/g, 'd')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
}
