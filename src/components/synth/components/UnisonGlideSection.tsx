'use client'

import React, { useState, useEffect } from 'react'
import { Knob } from './Knob'
import { LED } from './LED'
import { ToggleButtonWithLED } from './ToggleButtonWithLED'
import { ArpeggiatorSection } from './ArpeggiatorSection'

interface UnisonGlideSectionProps {
  unison: {
    enabled: boolean
    voices: number
    detune: number
  }
  glide: {
    enabled: boolean
    time: number
    legato: boolean
  }
  arpeggiator: {
    enabled: boolean
    rate: number
    pattern: 'up' | 'down' | 'upDown' | 'random'
    octaveRange: number
    gate: number
    hold: boolean
  }
  onUnisonChange: (unison: Partial<{ enabled: boolean; voices: number; detune: number }>) => void
  onGlideChange: (glide: Partial<{ enabled: boolean; time: number; legato: boolean }>) => void
  onArpeggiatorChange: (arpeggiator: Partial<{
    enabled: boolean
    rate: number
    pattern: 'up' | 'down' | 'upDown' | 'random'
    octaveRange: number
    gate: number
    hold: boolean
  }>) => void
}

export function UnisonGlideSection({
  unison,
  glide,
  arpeggiator,
  onUnisonChange,
  onGlideChange,
  onArpeggiatorChange
}: UnisonGlideSectionProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [mobileUnisonExpanded, setMobileUnisonExpanded] = useState(false)
  const [mobileGlideExpanded, setMobileGlideExpanded] = useState(false)
  const [mobileArpeggiatorExpanded, setMobileArpeggiatorExpanded] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleUnison = () => {
    onUnisonChange({ enabled: !unison.enabled })
  }

  const toggleGlide = () => {
    onGlideChange({ enabled: !glide.enabled })
  }

  const toggleMobileUnison = () => {
    setMobileUnisonExpanded(!mobileUnisonExpanded)
  }

  const toggleMobileGlide = () => {
    setMobileGlideExpanded(!mobileGlideExpanded)
  }

  const toggleMobileArpeggiator = () => {
    setMobileArpeggiatorExpanded(!mobileArpeggiatorExpanded)
  }

  return (
    <div className="synth-section">
      <div className="synth-section-title">PERFORM</div>
      
      {/* Desktop Layout - Integrated Controls (Always Visible) */}
      {!isMobile && (
        <div className="space-y-2">
          {/* Unison and Glide Sections Side by Side */}
          <div className="grid grid-cols-2 gap-2">
            {/* Unison Section */}
            <div className="synth-subsection-desktop subsection-with-led">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-gray-500">UNISON</span>
                  <ToggleButtonWithLED
                    enabled={unison.enabled}
                    onToggle={toggleUnison}
                    label="UNISON"
                    color="amber"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1">
                <div className="synth-knob-compact">
                  <Knob
                    value={unison.voices}
                    min={2}
                    max={6}
                    step={1}
                    label="Voices"
                    onChange={(v) => onUnisonChange({ voices: Math.round(v) })}
                    size="xs"
                  />
                </div>
                <div className="synth-knob-compact">
                  <Knob
                    value={unison.detune}
                    min={0.01}
                    max={0.5}
                    step={0.01}
                    label="Detune"
                    onChange={(v) => onUnisonChange({ detune: v })}
                    size="xs"
                  />
                </div>
              </div>
            </div>

            {/* Glide Section */}
            <div className="synth-subsection-desktop subsection-with-led">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-gray-500">GLIDE</span>
                  <ToggleButtonWithLED
                    enabled={glide.enabled}
                    onToggle={toggleGlide}
                    label="GLIDE"
                    color="green"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1">
                <div className="synth-knob-compact">
                  <Knob
                    value={glide.time}
                    min={0.01}
                    max={1}
                    step={0.01}
                    label="Time"
                    unit="s"
                    onChange={(v) => onGlideChange({ time: v })}
                    size="xs"
                  />
                </div>
                <div className="synth-knob-compact">
                  <div className="text-[8px] font-mono text-gray-500">Legato</div>
                  <button
                    className={`synth-skeu-button text-[8px] ${
                      glide.legato ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-700 text-gray-300 border-gray-600'
                    }`}
                    onClick={() => onGlideChange({ legato: !glide.legato })}
                  >
                    {glide.legato ? 'YES' : 'NO'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Arpeggiator Section */}
          <ArpeggiatorSection
            arpeggiator={arpeggiator}
            onArpeggiatorChange={onArpeggiatorChange}
          />
        </div>
      )}

      {/* Mobile Layout - Expandable Sections */}
      {isMobile && (
        <div className="space-y-2">
          {/* Unison Section - Mobile */}
          <div className="synth-subsection-mobile subsection-with-led">
            <div className="flex items-center justify-between p-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-gray-500">UNISON</span>
                <ToggleButtonWithLED
                  enabled={unison.enabled}
                  onToggle={toggleUnison}
                  label="UNISON"
                  color="amber"
                />
              </div>
              <button
                onClick={toggleMobileUnison}
                className="text-[8px] font-mono text-gray-400 hover:text-gray-300 transition-colors"
              >
                {mobileUnisonExpanded ? '▼' : '▶'}
              </button>
            </div>
            
            {mobileUnisonExpanded && (
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-2 gap-1">
                  <div className="synth-knob-compact">
                    <Knob
                      value={unison.voices}
                      min={2}
                      max={6}
                      step={1}
                      label="Voices"
                      onChange={(v) => onUnisonChange({ voices: Math.round(v) })}
                      size="xs"
                    />
                  </div>
                  <div className="synth-knob-compact">
                    <Knob
                      value={unison.detune}
                      min={0.01}
                      max={0.5}
                      step={0.01}
                      label="Detune"
                      onChange={(v) => onUnisonChange({ detune: v })}
                      size="xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Glide Section - Mobile */}
          <div className="synth-subsection-mobile subsection-with-led">
            <div className="flex items-center justify-between p-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-gray-500">GLIDE</span>
                <ToggleButtonWithLED
                  enabled={glide.enabled}
                  onToggle={toggleGlide}
                  label="GLIDE"
                  color="green"
                />
              </div>
              <button
                onClick={toggleMobileGlide}
                className="text-[8px] font-mono text-gray-400 hover:text-gray-300 transition-colors"
              >
                {mobileGlideExpanded ? '▼' : '▶'}
              </button>
            </div>
            
            {mobileGlideExpanded && (
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-2 gap-1">
                  <div className="synth-knob-compact">
                    <Knob
                      value={glide.time}
                      min={0.01}
                      max={1}
                      step={0.01}
                      label="Time"
                      unit="s"
                      onChange={(v) => onGlideChange({ time: v })}
                      size="xs"
                    />
                  </div>
                  <div className="synth-knob-compact">
                    <div className="text-[8px] font-mono text-gray-500">Legato</div>
                    <button
                      className={`synth-button-small text-[8px] w-full ${
                        glide.legato ? 'bg-cyan-600 text-white border-cyan-500' : ''
                      }`}
                      onClick={() => onGlideChange({ legato: !glide.legato })}
                    >
                      {glide.legato ? 'YES' : 'NO'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Arpeggiator Section - Mobile */}
          <div className="synth-subsection-mobile subsection-with-led">
            <div className="flex items-center justify-between p-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-gray-500">ARP</span>
                <ToggleButtonWithLED
                  enabled={arpeggiator.enabled}
                  onToggle={() => onArpeggiatorChange({ enabled: !arpeggiator.enabled })}
                  label="ARP"
                  color="purple"
                />
              </div>
              <button
                onClick={toggleMobileArpeggiator}
                className="text-[8px] font-mono text-gray-400 hover:text-gray-300 transition-colors"
              >
                {mobileArpeggiatorExpanded ? '▼' : '▶'}
              </button>
            </div>
            
            {mobileArpeggiatorExpanded && (
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-3 gap-1">
                  <div className="synth-knob-compact">
                    <Knob
                      value={arpeggiator.rate}
                      min={1}
                      max={32}
                      step={1}
                      label="Rate"
                      unit="BPM"
                      onChange={(v) => onArpeggiatorChange({ rate: Math.round(v) })}
                      size="xs"
                    />
                  </div>
                  <div className="synth-knob-compact">
                    <Knob
                      value={arpeggiator.octaveRange}
                      min={1}
                      max={4}
                      step={1}
                      label="Octaves"
                      onChange={(v) => onArpeggiatorChange({ octaveRange: Math.round(v) })}
                      size="xs"
                    />
                  </div>
                  <div className="synth-knob-compact">
                    <Knob
                      value={arpeggiator.gate}
                      min={0.1}
                      max={1}
                      step={0.05}
                      label="Gate"
                      unit="%"
                      onChange={(v) => onArpeggiatorChange({ gate: v })}
                      size="xs"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-1">
                  <button
                    className={`synth-button-small text-[7px] ${
                      arpeggiator.pattern === 'up' ? 'bg-purple-600 text-white border-purple-500' : ''
                    }`}
                    onClick={() => onArpeggiatorChange({ pattern: 'up' })}
                  >
                    UP
                  </button>
                  <button
                    className={`synth-button-small text-[7px] ${
                      arpeggiator.pattern === 'down' ? 'bg-purple-600 text-white border-purple-500' : ''
                    }`}
                    onClick={() => onArpeggiatorChange({ pattern: 'down' })}
                  >
                    DOWN
                  </button>
                  <button
                    className={`synth-button-small text-[7px] ${
                      arpeggiator.pattern === 'upDown' ? 'bg-purple-600 text-white border-purple-500' : ''
                    }`}
                    onClick={() => onArpeggiatorChange({ pattern: 'upDown' })}
                  >
                    UP/DN
                  </button>
                  <button
                    className={`synth-button-small text-[7px] ${
                      arpeggiator.pattern === 'random' ? 'bg-purple-600 text-white border-purple-500' : ''
                    }`}
                    onClick={() => onArpeggiatorChange({ pattern: 'random' })}
                  >
                    RAND
                  </button>
                </div>
                
                <div>
                  <button
                    className={`synth-button-small text-[8px] w-full ${
                      arpeggiator.hold ? 'bg-purple-600 text-white border-purple-500' : ''
                    }`}
                    onClick={() => onArpeggiatorChange({ hold: !arpeggiator.hold })}
                  >
                    HOLD: {arpeggiator.hold ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}