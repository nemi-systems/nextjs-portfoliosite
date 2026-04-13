'use client'

import React from 'react'
import { Knob } from './Knob'
import { LED } from './LED'

interface ChorusSectionProps {
  rate: number
  depth: number
  mix: number
  drive: number
  onRateChange: (rate: number) => void
  onDepthChange: (depth: number) => void
  onMixChange: (mix: number) => void
  onDriveChange: (drive: number) => void
}

export function ChorusSection({
  rate,
  depth,
  mix,
  drive,
  onRateChange,
  onDepthChange,
  onMixChange,
  onDriveChange
}: ChorusSectionProps) {
  return (
    <div className="synth-section">
      <div className="synth-section-title flex items-center justify-between">
        <span>FX BUS</span>
        <LED active={mix > 0} color="amber" size="xs" />
      </div>
      
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {/* Rate Knob */}
        <div className="synth-knob-compact">
          <div className="synth-text-sm synth-mb-1 text-center synth-var-ink-1">
            RATE
          </div>
          <div className="flex justify-center">
            <Knob
              value={rate}
              min={0.1}
              max={10}
              step={0.1}
              label=""
              unit=" Hz"
              onChange={onRateChange}
              size="sm"
            />
          </div>
        </div>

        {/* Depth Knob */}
        <div className="synth-knob-compact">
          <div className="synth-text-sm synth-mb-1 text-center synth-var-ink-1">
            DEPTH
          </div>
          <div className="flex justify-center">
            <Knob
              value={depth}
              min={0}
              max={1}
              step={0.01}
              label=""
              unit="%"
              onChange={(v) => onDepthChange(v)}
              size="sm"
            />
          </div>
        </div>

        {/* Mix Knob */}
        <div className="synth-knob-compact">
          <div className="synth-text-sm synth-mb-1 text-center synth-var-ink-1">
            MIX
          </div>
          <div className="flex justify-center">
            <Knob
              value={mix}
              min={0}
              max={1}
              step={0.01}
              label=""
              unit="%"
              onChange={(v) => onMixChange(v)}
              size="sm"
            />
          </div>
        </div>

        {/* Drive Knob */}
        <div className="synth-knob-compact">
          <div className="synth-text-sm synth-mb-1 text-center synth-var-ink-1">
            DRIVE
          </div>
          <div className="flex justify-center">
            <Knob
              value={drive}
              min={0}
              max={1}
              step={0.01}
              label=""
              unit="%"
              onChange={(v) => onDriveChange(v)}
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
