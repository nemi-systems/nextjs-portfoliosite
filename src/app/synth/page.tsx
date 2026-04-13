'use client'

import { HybridSynth } from '@/components/synth/HybridSynth'

export default function SynthPage() {
  return (
    <div className="min-h-screen bg-bg-main p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <HybridSynth />
      </div>
    </div>
  )
}