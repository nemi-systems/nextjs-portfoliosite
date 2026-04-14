import './globals.css'
import 'katex/dist/katex.min.css'
import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'

import { AccentThemeProvider } from './AccentThemeProvider'
import { getAccentThemeInitScript } from './accentTheme'

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'nemi',
  description: "I'm nemi.",
  icons: {
    icon: [
      { url: '/favicon.ico', rel: 'icon', sizes: 'any' },
      { url: '/icon.png', rel: 'icon', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={jetbrainsMono.className}>
        <Script id="accent-theme-init" strategy="beforeInteractive">
          {getAccentThemeInitScript()}
        </Script>
        <AccentThemeProvider>
          {children}
        </AccentThemeProvider>
        {/* Cloudflare Web Analytics */}
        <Script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "a0b5f81b8b7f4406913685e3e93826e7"}'
        />
        {/* End Cloudflare Web Analytics */}
      </body>
    </html>
  )
}
