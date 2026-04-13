'use client'

import React, { useState, useEffect } from 'react'
import { Knob } from './Knob'
import { LED } from './LED'
import { WaveButtonGroup, type WaveformType } from './WaveButton'
import { VoiceToggle } from './VoiceToggle'

interface OscillatorSectionProps {
  waveform: OscillatorType
  waveform2: OscillatorType
  mix1: number
  mix2: number
  tune1: number
  tune2: number
  enabled1: boolean
  enabled2: boolean
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
  onWaveformChange: (waveform: OscillatorType) => void
  onWaveform2Change: (waveform: OscillatorType) => void
  onMix1Change: (mix: number) => void
  onMix2Change: (mix: number) => void
  onTune1Change: (tune: number) => void
  onTune2Change: (tune: number) => void
  onEnabled1Change: (enabled: boolean) => void
  onEnabled2Change: (enabled: boolean) => void
  onUnisonChange: (unison: Partial<{ enabled: boolean; voices: number; detune: number }>) => void
  onGlideChange: (glide: Partial<{ enabled: boolean; time: number; legato: boolean }>) => void
}

const WAVEFORMS: WaveformType[] = ['sawtooth', 'square', 'sine', 'triangle']

export function OscillatorSection({
  waveform,
  waveform2,
  mix1,
  mix2,
  tune1,
  tune2,
  enabled1,
  enabled2,
  unison,
  glide,
  onWaveformChange,
  onWaveform2Change,
  onMix1Change,
  onMix2Change,
  onTune1Change,
  onTune2Change,
  onEnabled1Change,
  onEnabled2Change
}: OscillatorSectionProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  return (
    <div className="synth-section">
      
      {/* Two oscillator blocks stacked vertically */}
      <div className="flex flex-col gap-2">
        {/* OSC 1 */}
        <div className={isMobile ? "synth-subsection-mobile" : "synth-subsection-desktop"}>
          <div className="flex flex-col items-center gap-2">
            {/* Voice toggle above waveform on mobile, to the right on desktop */}
            {isMobile ? (
              <VoiceToggle
                enabled={enabled1}
                onToggle={onEnabled1Change}
                voiceNumber={1}
                color="amber"
              />
            ) : (
              <div className="flex items-center justify-center gap-3 w-full">
                <WaveButtonGroup
                  waveforms={WAVEFORMS}
                  selectedWaveform={waveform as WaveformType}
                  onWaveformChange={onWaveformChange}
                  labelMode="abbreviated"
                  showIcons={true}
                  size="sm"
                />
                <VoiceToggle
                  enabled={enabled1}
                  onToggle={onEnabled1Change}
                  voiceNumber={1}
                  color="amber"
                />
              </div>
            )}
            
            {isMobile && (
              <WaveButtonGroup
                waveforms={WAVEFORMS}
                selectedWaveform={waveform as WaveformType}
                onWaveformChange={onWaveformChange}
                labelMode="abbreviated"
                showIcons={true}
                size="sm"
              />
            )}
            <div className="grid grid-cols-2 gap-2 w-full place-items-center">
              <div className="synth-knob-compact">
                <Knob
                  value={tune1}
                  min={-12}
                  max={12}
                  step={0.01}
                  label="Tune"
                  unit="st"
                  onChange={(v) => onTune1Change(v)}
                  size="sm"
                />
              </div>
              <div className="synth-knob-compact">
                <Knob
                  value={mix1}
                  min={0}
                  max={1}
                  step={0.01}
                  label="Mix"
                  unit="%"
                  onChange={(v) => onMix1Change(v)}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* OSC 2 */}
        <div className={isMobile ? "synth-subsection-mobile" : "synth-subsection-desktop"}>
          <div className="flex flex-col items-center gap-2">
            {/* Voice toggle above waveform on mobile, to the right on desktop */}
            {isMobile ? (
              <VoiceToggle
                enabled={enabled2}
                onToggle={onEnabled2Change}
                voiceNumber={2}
                color="cyan"
              />
            ) : (
              <div className="flex items-center justify-center gap-3 w-full">
                <WaveButtonGroup
                  waveforms={WAVEFORMS}
                  selectedWaveform={waveform2 as WaveformType}
                  onWaveformChange={onWaveform2Change}
                  labelMode="abbreviated"
                  showIcons={true}
                  size="sm"
                />
                <VoiceToggle
                  enabled={enabled2}
                  onToggle={onEnabled2Change}
                  voiceNumber={2}
                  color="cyan"
                />
              </div>
            )}
            
            {isMobile && (
              <WaveButtonGroup
                waveforms={WAVEFORMS}
                selectedWaveform={waveform2 as WaveformType}
                onWaveformChange={onWaveform2Change}
                labelMode="abbreviated"
                showIcons={true}
                size="sm"
              />
            )}
            <div className="grid grid-cols-2 gap-2 w-full place-items-center">
              <div className="synth-knob-compact">
                <Knob
                  value={tune2}
                  min={-12}
                  max={12}
                  step={0.01}
                  label="Tune"
                  unit="st"
                  onChange={(v) => onTune2Change(v)}
                  size="sm"
                />
              </div>
              <div className="synth-knob-compact">
                <Knob
                  value={mix2}
                  min={0}
                  max={1}
                  step={0.01}
                  label="Mix"
                  unit="%"
                  onChange={(v) => onMix2Change(v)}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
