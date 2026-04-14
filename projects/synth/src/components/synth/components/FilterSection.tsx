'use client'

import React, { useMemo } from 'react'
import { Knob } from './Knob'
import { formatFrequencykHz } from '@/lib/synth-utils'
import { FilterTypeButtons, type FilterTypeOption } from './FilterTypeButtons'

interface FilterSectionProps {
  type?: BiquadFilterType
  cutoff: number
  resonance: number
  envelopeAmount: number
  onTypeChange?: (type: BiquadFilterType) => void
  onCutoffChange: (cutoff: number) => void
  onResonanceChange: (resonance: number) => void
  onEnvelopeAmountChange: (amount: number) => void
}

export function FilterSection({ 
  type = 'lowpass',
  cutoff, 
  resonance, 
  envelopeAmount,
  onTypeChange,
  onCutoffChange, 
  onResonanceChange,
  onEnvelopeAmountChange
}: FilterSectionProps) {
  // Memoize filter curve generation to prevent hydration mismatches
  const filterCurvePath = useMemo(() => {
    return generateFilterCurve(type, cutoff, resonance)
  }, [type, cutoff, resonance])

  const cutoffXPosition = useMemo(() => {
    return frequencyToX(cutoff)
  }, [cutoff])

  return (
    <div className="synth-section">
      <div className="synth-section-title text-left">FILTER</div>
      <div className="flex items-center justify-center mb-2">
        <FilterTypeButtons selectedType={type as FilterTypeOption} onChange={(t) => onTypeChange?.(t as BiquadFilterType)} />
      </div>
      
      <div className="grid grid-cols-3 gap-1 mb-2">
        {/* Cutoff Frequency */}
        <div className="synth-knob-compact">
          <Knob
            value={cutoff}
            min={20}
            max={20000}
            step={1}
            label="FREQ"
            unit="Hz"
            color="cyan"
            onChange={onCutoffChange}
            size="sm"
          />
        </div>

        {/* Resonance */}
        <div className="synth-knob-compact">
          <Knob
            value={resonance}
            min={0.1}
            max={15}
            step={0.1}
            label="Q"
            color="cyan"
            onChange={onResonanceChange}
            size="sm"
          />
        </div>

        {/* Envelope Amount */}
        <div className="synth-knob-compact">
          <Knob
            value={envelopeAmount}
            min={0}
            max={1}
            step={0.01}
            label="ENV"
            color="cyan"
            onChange={onEnvelopeAmountChange}
            size="sm"
          />
        </div>

        {/* (Key tracking removed) */}
      </div>

      {/* Filter Response Visualization – styled like scopes */}
      <div className="relative bezel">
        <svg
          width={200}
          height={120}
          viewBox="0 0 200 60"
          className="w-full h-24 bg-black border border-gray-700 rounded overflow-visible"
        >
          {/* Axes */}
          <line x1="0" y1="45" x2="200" y2="45" stroke="#374151" strokeWidth="1" />
          <line x1="0" y1="15" x2="200" y2="15" stroke="#1f2937" strokeWidth="0.5" />

          {/* Frequency labels */}
          <text x="5" y="58" fill="#6b7280" fontSize="8" fontFamily="monospace">20Hz</text>
          <text x="85" y="58" fill="#6b7280" fontSize="8" fontFamily="monospace">1k</text>
          <text x="165" y="58" fill="#6b7280" fontSize="8" fontFamily="monospace">20k</text>

          {/* Filter curve */}
          <path
            d={filterCurvePath}
            stroke="#22d3ee"
            strokeWidth="2"
            fill="none"
            className="opacity-90"
          />

          {/* Cutoff indicator */}
          <line
            x1={cutoffXPosition}
            y1="15"
            x2={cutoffXPosition}
            y2="45"
            stroke="#22d3ee"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* (Drive moved to FX bus) */}
    </div>
  )
}

// Helper functions
function frequencyToX(freq: number): number {
  // Logarithmic scale mapping
  const minFreq = Math.log10(20)
  const maxFreq = Math.log10(20000)
  const normalized = (Math.log10(freq) - minFreq) / (maxFreq - minFreq)
  return Math.max(0, Math.min(200, normalized * 200))
}

function generateFilterCurve(type: BiquadFilterType, cutoff: number, resonance: number): string {
  const points = []
  const numPoints = 50
  
  for (let i = 0; i <= numPoints; i++) {
    const x = (i / numPoints) * 200
    const freq = 20 * Math.pow(1000, x / 200) // Logarithmic frequency scale
    const normalizedFreq = freq / cutoff
    let response = 1

    switch (type) {
      case 'lowpass': {
        response = 1 / Math.sqrt(1 + Math.pow(normalizedFreq, 2) * resonance)
        break
      }
      case 'highpass': {
        response = 1 / Math.sqrt(1 + Math.pow(1 / Math.max(1e-6, normalizedFreq), 2) * resonance)
        break
      }
      case 'bandpass': {
        // crude bandpass peak around cutoff, scaled by Q
        const q = Math.max(0.1, resonance)
        const bw = 1 / q
        const d = Math.log10(Math.max(1e-6, normalizedFreq))
        response = Math.exp(-Math.pow(d / bw, 2))
        break
      }
      case 'notch':
      default: {
        // crude notch attenuation around cutoff
        const q = Math.max(0.1, resonance)
        const bw = 1 / q
        const d = Math.log10(Math.max(1e-6, normalizedFreq))
        response = 1 - Math.exp(-Math.pow(d / bw, 2))
        break
      }
    }

    const y = 52.5 - (response * 37.5) // Scale and invert for display
    points.push(`${x},${Math.max(12, Math.min(48, y))}`)
  }
  
  return `M ${points.join(' L ')}`
}

function formatFrequency(freq: number): string {
  return formatFrequencykHz(freq).replace(' Hz', '').replace(' kHz', 'k')
}
