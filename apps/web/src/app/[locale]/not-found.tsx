import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'

export default function NotFoundPage() {
  const t = useTranslations('NotFound')

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-start justify-center gap-3 px-4 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">{t('description')}</p>
      <Link href="/" className="text-sm underline underline-offset-4">
        {t('home')}
      </Link>
    </main>
  )
}
