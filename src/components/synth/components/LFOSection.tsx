'use client'

import React from 'react'
import { Knob } from './Knob'
import { LED } from './LED'
import { WaveButtonGroup, type WaveformType } from './WaveButton'

interface LFOSectionProps {
  waveform: OscillatorType
  rate: number
  depth: number
  targets: {
    pitch: boolean
    cutoff: boolean
    pulseWidth: boolean
    amp: boolean
  }
  onWaveformChange: (waveform: OscillatorType) => void
  onRateChange: (rate: number) => void
  onDepthChange: (depth: number) => void
  onTargetChange: (
    target: keyof LFOSectionProps['targets'],
    enabled: boolean
  ) => void
}

const WAVEFORMS: WaveformType[] = ['sine', 'square', 'sawtooth', 'triangle']

export function LFOSection({
  waveform,
  rate,
  depth,
  targets,
  onWaveformChange,
  onRateChange,
  onDepthChange,
  onTargetChange
}: LFOSectionProps) {
  return (
    <div className="synth-section">
      <div className="synth-section-title flex items-center justify-between">
        <span>LFO/MOD</span>
        <LED active={targets.pitch || targets.cutoff || targets.amp} color="cyan" size="xs" />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {/* Waveform Selection */}
        <div className="col-span-2">
          <div className="flex justify-center">
            <WaveButtonGroup
              waveforms={WAVEFORMS}
              selectedWaveform={waveform as WaveformType}
              onWaveformChange={onWaveformChange}
              labelMode="icons-only"
              showIcons={true}
              size="sm"
            />
          </div>
        </div>

        {/* Rate Knob */}
        <div className="synth-knob-compact">
          <Knob
            value={rate}
            min={0.1}
            max={20}
            step={0.1}
            label="Rate"
            unit=" Hz"
            onChange={onRateChange}
            size="sm"
          />
        </div>

        {/* Depth Knob */}
        <div className="synth-knob-compact">
          <Knob
            value={depth}
            min={0}
            max={1}
            step={0.01}
            label="Depth"
            unit="%"
            onChange={(v) => onDepthChange(v)}
            size="sm"
          />
        </div>

        </div>
    </div>
  )
}
