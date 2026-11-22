import createMiddleware from 'next-intl/middleware'

import { routing } from '@/i18n/routing'

// Next.js 16 names the middleware file `proxy.ts`; `middleware.ts` is deprecated.
export default createMiddleware(routing)

export const config = {
  // Everything except API routes, Next.js internals and files with an extension.
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
