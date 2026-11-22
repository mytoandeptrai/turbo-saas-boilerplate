'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { LanguagesIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useTransition } from 'react'

import { usePathname, useRouter } from './navigation'
import { routing } from './routing'

import type { Locale } from './routing'

/** EN / VI menu that reloads the current page, filters included, in the chosen language. */
export function LocaleSwitcher() {
  const t = useTranslations('LocaleSwitcher')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const switchTo = (nextLocale: Locale) => {
    if (nextLocale === locale) return
    // Read at click time: filters live in the URL and change without re-rendering this menu.
    const { search, hash } = globalThis.location
    startTransition(() => {
      router.replace(`${pathname}${search}${hash}`, { locale: nextLocale, scroll: false })
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        // A fixed id: the generated one can differ between the streamed HTML and hydration.
        id="locale-switcher"
        aria-label={t('label')}
        disabled={isPending}
        className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium text-muted-foreground uppercase transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60 aria-expanded:text-foreground"
      >
        <LanguagesIcon aria-hidden className="size-3.5" />
        {locale}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuRadioGroup value={locale} onValueChange={(value: Locale) => switchTo(value)}>
          {routing.locales.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} lang={code}>
              {t(code)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
