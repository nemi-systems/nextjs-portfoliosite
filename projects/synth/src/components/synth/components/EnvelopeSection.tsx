'use client'

import React from 'react'
import { Knob } from './Knob'

interface EnvelopeSectionProps {
  attack: number
  decay: number
  sustain: number
  release: number
  onAttackChange: (attack: number) => void
  onDecayChange: (decay: number) => void
  onSustainChange: (sustain: number) => void
  onReleaseChange: (release: number) => void
}

export function EnvelopeSection({
  attack,
  decay,
  sustain,
  release,
  onAttackChange,
  onDecayChange,
  onSustainChange,
  onReleaseChange
}: EnvelopeSectionProps) {
  return (
    <div className="synth-section">
      <div className="synth-section-title flex items-center justify-between">
        <span>ENVELOPE</span>
        <div className="flex items-center space-x-2">
          <div className="
            led led--amber
            w-1.5 h-1.5 
            bg-amber-400 
            shadow-lg shadow-amber-400/50
            rounded-full 
            transition-all duration-300
            
            opacity-100
          " data-on="true"></div>
        </div>
      </div>
      
      {/* ADSR Controls Grid */}
      <div className="grid grid-cols-4 gap-1 mb-1">
        <div className="synth-knob-mini">
          <Knob
            value={attack}
            min={0.001}
            max={2}
            step={0.001}
            label="Atk"
            color="magenta"
            onChange={onAttackChange}
            size="xs"
            showValue={false}
          />
        </div>
        
        <div className="synth-knob-mini">
          <Knob
            value={decay}
            min={0.001}
            max={2}
            step={0.001}
            label="Dec"
            color="magenta"
            onChange={onDecayChange}
            size="xs"
            showValue={false}
          />
        </div>
        
        <div className="synth-knob-mini">
          <Knob
            value={sustain}
            min={0}
            max={1}
            step={0.01}
            label="Sus"
            color="magenta"
            onChange={onSustainChange}
            size="xs"
            showValue={false}
          />
        </div>
        
        <div className="synth-knob-mini">
          <Knob
            value={release}
            min={0.001}
            max={5}
            step={0.001}
            label="Rel"
            color="magenta"
            onChange={onReleaseChange}
            size="xs"
            showValue={false}
          />
        </div>
      </div>

      {/* Envelope Visualization – styled like scopes */}
      <div className="relative bezel">
        <svg
          width={240}
          height={100}
          viewBox="0 0 240 75"
          className="w-full h-20 bg-black border border-gray-700 rounded overflow-visible"
        >
          {/* Subtle grid */}
          <defs>
            <pattern id="grid-compact" width="20" height="6" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 6" fill="none" stroke="#1f2937" strokeWidth="0.5"/>
            </pattern>
          </defs>

          {/* Axes */}
          <line x1="0" y1="60" x2="240" y2="60" stroke="#374151" strokeWidth="1" />
          <line x1="0" y1="15" x2="0" y2="60" stroke="#374151" strokeWidth="1" />

          {/* ADSR Envelope Path */}
          <path
            d={generateEnvelopePath(attack, decay, sustain, release)}
            stroke="#22d3ee"
            strokeWidth="1.5"
            fill="none"
            className="opacity-90"
          />

          {/* Phase markers */}
          <circle cx="0" cy="60" r="2" fill="#22d3ee" />
          <circle cx={Math.min(attack * 40, 80)} cy="15" r="2" fill="#22d3ee" />
          <circle cx={Math.min((attack + decay) * 40, 120)} cy={60 - sustain * 45} r="2" fill="#22d3ee" />
          <circle cx={Math.min((attack + decay) * 40, 120) + 30} cy={60 - sustain * 45} r="2" fill="#22d3ee" />
          {(() => {
            // Keep marker logic in sync with path endpoint so they never detach
            const scaleX = 40 // Horizontal scale factor
            const scaleY = 40 // Vertical scale factor for amplitude
            const viewWidth = 240 // Matches SVG viewBox width

            const attackX = Math.min(attack * scaleX, 80) // Cap at 80 to leave room
            const decayX = Math.min((attack + decay) * scaleX, 120) // Cap at 120
            const sustainY = 60 - (sustain * scaleY) // Base at 60, scale down
            const sustainDuration = 30 // Fixed sustain duration for display
            // Ensure the release segment reaches the right edge at high values
            const releaseX = Math.min(decayX + sustainDuration + (release * scaleX), viewWidth)
            return <circle cx={releaseX} cy="60" r="2" fill="#22d3ee" />
          })()}

          {/* Value labels on graph */}
          <text x={Math.min(attack * 40, 80) - 10} y="75" fill="#22d3ee" fontSize="7" fontFamily="monospace" fontWeight="bold">A: {attack.toFixed(2)}s</text>
          <text x={Math.min(attack * 40, 80) - 10} y="12" fill="#22d3ee" fontSize="7" fontFamily="monospace" fontWeight="bold">D: {decay.toFixed(2)}s</text>
          <text x={Math.min((attack + decay) * 40, 120) - 8} y={50 - sustain * 40 - 3} fill="#22d3ee" fontSize="7" fontFamily="monospace" fontWeight="bold">S: {sustain.toFixed(2)}</text>
          <text x={Math.min((attack + decay) * 40, 120) + 25} y="12" fill="#22d3ee" fontSize="7" fontFamily="monospace" fontWeight="bold">R: {release.toFixed(2)}s</text>

        </svg>
      </div>
    </div>
  )
}

// Helper function to generate ADSR envelope path
function generateEnvelopePath(attack: number, decay: number, sustain: number, release: number): string {
  const scaleX = 40 // Horizontal scale factor
  const scaleY = 45 // Vertical scale factor for amplitude
  const viewWidth = 240 // Matches SVG viewBox width

  const attackX = Math.min(attack * scaleX, 80) // Cap at 80 to leave room
  const decayX = Math.min((attack + decay) * scaleX, 120) // Cap at 120
  const sustainY = 60 - (sustain * scaleY) // Base at 60, scale down
  const sustainDuration = 30 // Fixed sustain duration for display
  // Ensure the release segment reaches the right edge at high values
  const releaseX = Math.min(decayX + sustainDuration + (release * scaleX), viewWidth)

  return `M 0 60 L ${attackX} 15 L ${decayX} ${sustainY} L ${decayX + sustainDuration} ${sustainY} L ${releaseX} 60`
}
