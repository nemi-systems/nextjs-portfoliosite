'use client'

import { HybridSynth } from '@/components/synth/HybridSynth'

export default function SynthPage() {
  return (
    <div className="min-h-screen bg-bg-main p-4 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <HybridSynth />
      </div>
    </div>
  )
}
