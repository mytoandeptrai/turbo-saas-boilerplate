import { Analytics } from '@vercel/analytics/next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Be_Vietnam_Pro } from 'next/font/google'
import { notFound } from 'next/navigation'

import { env } from '@/config/env'
import { routing } from '@/i18n/routing'

import type { Metadata } from 'next'
import '@/styles/globals.css'

const fontSans = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

type LocaleParams = { params: Promise<{ locale: string }> }

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: 'Metadata' })

  const siteUrl = env.NEXT_PUBLIC_APP_URL

  return {
    title: t('title'),
    description: t('description'),
    // Canonical and hreflang links are absolute, so they are left out until the public origin is set.
    ...(siteUrl && {
      metadataBase: new URL(siteUrl),
      alternates: {
        canonical: `/${locale}`,
        languages: Object.fromEntries(routing.locales.map((code) => [code, `/${code}`])),
      },
    }),
  }
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode }> & LocaleParams) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    <html lang={locale} className={`dark ${fontSans.variable}`}>
      <head>
        <meta name="theme-color" content="#09090b" />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  )
}
