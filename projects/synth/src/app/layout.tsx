import './globals.css'
import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
import { preload } from 'react-dom'

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Synth',
  description: 'Browser synth with ADSR envelopes, filters, fx, unison, keyboard input, and live scopes.',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  preload('/synth-skins/knob2.svg', { as: 'image' })

  return (
    <html lang="en">
      <body className={jetbrainsMono.className}>{children}</body>
    </html>
  )
}
