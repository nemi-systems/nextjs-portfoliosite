'use client'

import React from 'react'
import { Knob } from './Knob'

interface MacroSectionProps {
  macros: {
    1: number
    2: number
    3: number
    4: number
  }
  onMacroChange: (macro: number, value: number) => void
}

const MACRO_LABELS = {
  1: 'BRIGHT',
  2: 'THICK', 
  3: 'MOVE',
  4: 'SPACE'
}

export function MacroSection({
  macros,
  onMacroChange
}: MacroSectionProps) {
  return (
    <div className="synth-section">
      <div className="synth-section-title">MACRO</div>
      
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Object.entries(macros).map(([num, value]) => (
          <div key={num} className="synth-knob-compact">
            <div className="synth-text-sm synth-mb-1 text-center synth-var-ink-1">
              {MACRO_LABELS[parseInt(num) as keyof typeof MACRO_LABELS]}
            </div>
            <div className="flex justify-center">
              <Knob
                value={value}
                min={0}
                max={1}
                step={0.01}
                label=""
                unit="%"
                onChange={(v) => onMacroChange(parseInt(num), v)}
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Spacer to match height of LFO/MOD section */}
      <div className="flex-1 min-h-[16px]"></div>

    </div>
  )
}
