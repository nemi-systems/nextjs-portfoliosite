'use client'

import React from 'react'
import { SynthButtonGroup } from './SynthButtonGroup'

export type WaveformType = 'sawtooth' | 'square' | 'sine' | 'triangle'
export type LabelMode = 'full' | 'abbreviated' | 'single' | 'icons-only'

export interface WaveButtonGroupProps {
  waveforms: WaveformType[]
  selectedWaveform: WaveformType
  onWaveformChange: (waveform: WaveformType) => void
  labelMode?: LabelMode
  showIcons?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const WAVEFORM_CONFIG = {
  sawtooth: {
    label: 'SAW',
    abbreviatedLabel: 'SAW',
    singleLabel: 'S',
    icon: (
      <svg viewBox="0 0 40 20" className="w-full h-full">
        <path
          d="M 2 18 L 38 2"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    )
  },
  square: {
    label: 'SQR',
    abbreviatedLabel: 'SQR',
    singleLabel: 'Q',
    icon: (
      <svg viewBox="0 0 40 20" className="w-full h-full">
        <path
          d="M 2 18 L 2 2 L 12 2 L 12 18 L 22 18 L 22 2 L 32 2 L 32 18 L 38 18"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    )
  },
  sine: {
    label: 'SIN',
    abbreviatedLabel: 'SIN',
    singleLabel: 'I',
    icon: (
      <svg viewBox="0 0 40 20" className="w-full h-full">
        <path
          d="M 2 10 Q 10 2 20 10 T 38 10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    )
  },
  triangle: {
    label: 'TRI',
    abbreviatedLabel: 'TRI',
    singleLabel: 'T',
    icon: (
      <svg viewBox="0 0 40 20" className="w-full h-full">
        <path
          d="M 2 18 L 20 2 L 38 18"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    )
  }
} as const

export function WaveButtonGroup({
  waveforms,
  selectedWaveform,
  onWaveformChange,
  labelMode = 'abbreviated',
  showIcons = false,
  size = 'md',
  className = ''
}: WaveButtonGroupProps) {
  const getLabel = (waveform: WaveformType) => {
    const config = WAVEFORM_CONFIG[waveform]
    switch (labelMode) {
      case 'full':
        return waveform.charAt(0).toUpperCase() + waveform.slice(1)
      case 'single':
        return config.singleLabel
      case 'abbreviated':
      default:
        return config.abbreviatedLabel
      case 'icons-only':
        return ''
    }
  }

  const options = waveforms.map(waveform => ({
    key: waveform,
    label: getLabel(waveform),
    icon: (showIcons || labelMode === 'icons-only') ? WAVEFORM_CONFIG[waveform].icon : undefined
  }))

  return (
    <SynthButtonGroup
      options={options}
      selectedKey={selectedWaveform}
      onChange={onWaveformChange as (key: string) => void}
      size={size}
      className={`${size === 'sm' ? 'w-28' : 'w-32'} ${className}`}
      showIcons={showIcons || labelMode === 'icons-only'}
    />
  )
}