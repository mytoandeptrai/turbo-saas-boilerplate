import { Be_Vietnam_Pro } from 'next/font/google'

import { env } from '@/config/env'

import type { Metadata } from 'next'
import '@/styles/globals.css'

const fontSans = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: 'Remote Engineering Jobs for Vietnamese & APAC Developers',
  description:
    'Curated remote engineering jobs open to Vietnam and APAC, sourced directly from company ATS feeds. Apply on the official ATS page.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${fontSans.variable}`}>
      <head>
        <meta name="theme-color" content="#09090b" />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
