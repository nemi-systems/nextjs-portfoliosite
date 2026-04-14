'use client'

import React, { useState, useEffect } from 'react'
import { Knob } from './Knob'
import { LED } from './LED'
import { ToggleButtonWithLED } from './ToggleButtonWithLED'

interface ArpeggiatorSectionProps {
  arpeggiator: {
    enabled: boolean
    rate: number
    pattern: 'up' | 'down' | 'upDown' | 'random'
    octaveRange: number
    gate: number
    hold: boolean
  }
  onArpeggiatorChange: (arpeggiator: Partial<{
    enabled: boolean
    rate: number
    pattern: 'up' | 'down' | 'upDown' | 'random'
    octaveRange: number
    gate: number
    hold: boolean
  }>) => void
}

export function ArpeggiatorSection({
  arpeggiator,
  onArpeggiatorChange
}: ArpeggiatorSectionProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleArpeggiator = () => {
    onArpeggiatorChange({ enabled: !arpeggiator.enabled })
  }

  const toggleMobile = () => {
    setMobileExpanded(!mobileExpanded)
  }

  const handlePatternChange = (pattern: 'up' | 'down' | 'upDown' | 'random') => {
    onArpeggiatorChange({ pattern })
  }

  const getPatternLabel = (pattern: string) => {
    switch (pattern) {
      case 'up': return 'UP'
      case 'down': return 'DOWN'
      case 'upDown': return 'UP/DOWN'
      case 'random': return 'RANDOM'
      default: return pattern.toUpperCase()
    }
  }

  return (
    <>
      
      {/* Desktop Layout */}
      {!isMobile && (
        <div className="space-y-2">
          {/* Arpeggiator Section */}
          <div className="synth-subsection-desktop subsection-with-led">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-gray-500">ARP</span>
                <ToggleButtonWithLED
                  enabled={arpeggiator.enabled}
                  onToggle={toggleArpeggiator}
                  label="ARP"
                  color="purple"
                />
              </div>
              <button
                className={`synth-skeu-button text-[8px] ${
                  arpeggiator.hold ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-700 text-gray-300 border-gray-600'
                }`}
                onClick={() => onArpeggiatorChange({ hold: !arpeggiator.hold })}
              >
                HOLD
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-1">
              <div className="synth-knob-compact">
                <Knob
                  value={arpeggiator.rate}
                  min={20}
                  max={200}
                  step={1}
                  label="Rate"
                  unit="Hz"
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
            
            {/* Pattern and Hold buttons */}
            <div className="grid grid-cols-4 gap-1 mt-2">
              <button
                className={`synth-button-small text-[7px] ${
                  arpeggiator.pattern === 'up' ? 'bg-purple-600 text-white border-purple-500' : ''
                }`}
                onClick={() => handlePatternChange('up')}
              >
                UP
              </button>
              <button
                className={`synth-button-small text-[7px] ${
                  arpeggiator.pattern === 'down' ? 'bg-purple-600 text-white border-purple-500' : ''
                }`}
                onClick={() => handlePatternChange('down')}
              >
                DOWN
              </button>
              <button
                className={`synth-button-small text-[7px] ${
                  arpeggiator.pattern === 'upDown' ? 'bg-purple-600 text-white border-purple-500' : ''
                }`}
                onClick={() => handlePatternChange('upDown')}
              >
                UP/DN
              </button>
              <button
                className={`synth-button-small text-[7px] ${
                  arpeggiator.pattern === 'random' ? 'bg-purple-600 text-white border-purple-500' : ''
                }`}
                onClick={() => handlePatternChange('random')}
              >
                RAND
              </button>
            </div>
            </div>
        </div>
      )}

      {/* Mobile Layout */}
      {isMobile && (
        <div className="space-y-2">
          <div className="synth-subsection-mobile subsection-with-led">
            <div className="flex items-center justify-between p-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-gray-500">ARP</span>
                <ToggleButtonWithLED
                  enabled={arpeggiator.enabled}
                  onToggle={toggleArpeggiator}
                  label="ARP"
                  color="purple"
                />
                <button
                  className={`synth-skeu-button text-[8px] ${
                    arpeggiator.hold ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-700 text-gray-300 border-gray-600'
                  }`}
                  onClick={() => onArpeggiatorChange({ hold: !arpeggiator.hold })}
                >
                  HOLD
                </button>
              </div>
              <button
                onClick={toggleMobile}
                className="text-[8px] font-mono text-gray-400 hover:text-gray-300 transition-colors"
              >
                {mobileExpanded ? '▼' : '▶'}
              </button>
            </div>
            
            {mobileExpanded && (
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-3 gap-1">
                  <div className="synth-knob-compact">
                    <Knob
                      value={arpeggiator.rate}
                      min={20}
                      max={200}
                      step={1}
                      label="Rate"
                      unit="Hz"
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
                    onClick={() => handlePatternChange('up')}
                  >
                    UP
                  </button>
                  <button
                    className={`synth-button-small text-[7px] ${
                      arpeggiator.pattern === 'down' ? 'bg-purple-600 text-white border-purple-500' : ''
                    }`}
                    onClick={() => handlePatternChange('down')}
                  >
                    DOWN
                  </button>
                  <button
                    className={`synth-button-small text-[7px] ${
                      arpeggiator.pattern === 'upDown' ? 'bg-purple-600 text-white border-purple-500' : ''
                    }`}
                    onClick={() => handlePatternChange('upDown')}
                  >
                    UP/DN
                  </button>
                  <button
                    className={`synth-button-small text-[7px] ${
                      arpeggiator.pattern === 'random' ? 'bg-purple-600 text-white border-purple-500' : ''
                    }`}
                    onClick={() => handlePatternChange('random')}
                  >
                    RAND
                  </button>
                </div>
                </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}