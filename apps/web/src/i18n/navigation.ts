import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

/** Locale-aware replacements for the `next/navigation` APIs. */
export const { Link, usePathname, useRouter } = createNavigation(routing)
