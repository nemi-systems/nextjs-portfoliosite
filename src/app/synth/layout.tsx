import type { ReactNode } from 'react'
import { preload } from 'react-dom'

export default function SynthLayout({
  children,
}: {
  children: ReactNode
}) {
  preload('/synth-skins/knob2.svg', { as: 'image' })

  return <>{children}</>
}
