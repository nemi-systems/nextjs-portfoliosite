'use client'

import React, { useState, useEffect, useRef } from 'react'
import { OscillatorSection } from './components/OscillatorSection'
import { FilterSection } from './components/FilterSection'
import { EnvelopeSection } from './components/EnvelopeSection'
import { MasterSection } from './components/MasterSection'
import { LFOSection } from './components/LFOSection'
import { ChorusSection } from './components/ChorusSection'
import { Scopes } from './components/Scopes'
import { MacroSection } from './components/MacroSection'
import { UnisonGlideSection } from './components/UnisonGlideSection'
import { ArpeggiatorSection } from './components/ArpeggiatorSection'
import { ScopesMasterSection } from './components/ScopesMasterSection'
import { Keyboard } from './components/Keyboard'
import { Analyzer } from './components/Analyzer'
import { LED } from './components/LED'
import { PowerButton } from './components/PowerButton'
import { PanicButton } from './components/PanicButton'
import { useSynthEngine } from './hooks/useSynthEngine'
import { useKeyboardControls } from './hooks/useKeyboardControls'

export function HybridSynth() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [mouseActiveKeys, setMouseActiveKeys] = useState<Set<string>>(new Set())
  const [currentOctave, setCurrentOctave] = useState(4)
  const audioContextRef = useRef<AudioContext | null>(null)
  
  const {
    audioState,
    updateOscillator,
    updateFilter,
    updateEnvelope,
    updateFilterEnvelope,
    updateGain,
    updateDelay,
    updateLFO,
    updateChorus,
    updateArpeggiator,
    updateMacros,
    updatePerformance,
    playNote,
    releaseNote,
    panic,
    isPlaying,
    analyser
  } = useSynthEngine(audioContextRef.current)

  // Initialize audio context on first user interaction
  const initAudio = async () => {
    if (!isInitialized) {
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = context
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize audio context:', error)
      }
    }
  }

  // Handle audio context resume
  const handleInitClick = async () => {
    await initAudio()
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume()
    }
  }

  const handlePanicClick = () => {
    panic()
  }

  const handleOctaveUp = () => {
    setCurrentOctave(prev => Math.min(prev + 1, 7))
  }

  const handleOctaveDown = () => {
    setCurrentOctave(prev => Math.max(prev - 1, 1))
  }

  const { activeKeys } = useKeyboardControls({
    onNoteOn: playNote,
    onNoteOff: releaseNote,
    currentOctave,
    onOctaveUp: handleOctaveUp,
    onOctaveDown: handleOctaveDown
  })

  const handleMouseActiveKeysChange = (activeKeys: Set<string>) => {
    setMouseActiveKeys(activeKeys)
  }

  return (
    <div className="synth-chassis synth--noise max-w-7xl mx-auto flex flex-col">
      {/* Status Bar */}
      <div className="synth-status-bar">
        <div className="flex items-center space-x-3">
          <LED active={isInitialized} color="green" size="sm" />
          <LED active={isPlaying} color="amber" size="sm" />
          <LED active={Object.keys(activeKeys).length > 0 || mouseActiveKeys.size > 0} color="cyan" size="sm" />
          </div>
        
        <div className="flex items-center space-x-4">
          <PowerButton 
            isOn={isInitialized}
            onToggle={handleInitClick}
          />
          <PanicButton 
            onPanic={handlePanicClick}
          />
        </div>
      </div>

      {/* Keyboard */}
      <div className="synth-keyboard-container">
        <Keyboard 
          activeKeys={activeKeys}
          onNoteOn={playNote}
          onNoteOff={releaseNote}
          onMouseActiveKeysChange={handleMouseActiveKeysChange}
          currentOctave={currentOctave}
          onOctaveUp={handleOctaveUp}
          onOctaveDown={handleOctaveDown}
        />
      </div>

      {/* Main 4x2 Grid Layout */}
      <div className="synth-grid-desktop">
        {/* Top Row: Sound Design */}
        <div className="synth-grid-osc">
          <OscillatorSection 
            waveform={audioState.oscillator.waveform}
            waveform2={audioState.oscillator.waveform2 || audioState.oscillator.waveform}
            mix1={audioState.oscillator.mix1}
            mix2={audioState.oscillator.mix2}
            tune1={audioState.oscillator.tune1 || 0}
            tune2={audioState.oscillator.tune2 || 0}
            enabled1={audioState.oscillator.enabled1}
            enabled2={audioState.oscillator.enabled2}
            unison={audioState.oscillator.unison}
            glide={audioState.oscillator.glide}
            onWaveformChange={(waveform) => updateOscillator({ waveform })}
            onWaveform2Change={(waveform2) => updateOscillator({ waveform2 })}
            onMix1Change={(mix1) => updateOscillator({ mix1 } as any)}
            onMix2Change={(mix2) => updateOscillator({ mix2 } as any)}
            onTune1Change={(tune1) => updateOscillator({ tune1 } as any)}
            onTune2Change={(tune2) => updateOscillator({ tune2 } as any)}
            onEnabled1Change={() => updateOscillator({ enabled1: !audioState.oscillator.enabled1 })}
            onEnabled2Change={() => updateOscillator({ enabled2: !audioState.oscillator.enabled2 })}
            onUnisonChange={(unison) => updateOscillator({ unison: { ...audioState.oscillator.unison, ...unison } })}
            onGlideChange={(glide) => updateOscillator({ glide: { ...audioState.oscillator.glide, ...glide } })}
          />
        </div>

        <div className="synth-grid-unison-glide">
          <UnisonGlideSection
            unison={audioState.oscillator.unison}
            glide={audioState.oscillator.glide}
            arpeggiator={audioState.arpeggiator}
            onUnisonChange={(unison) => updateOscillator({ unison: { ...audioState.oscillator.unison, ...unison } })}
            onGlideChange={(glide) => updateOscillator({ glide: { ...audioState.oscillator.glide, ...glide } })}
            onArpeggiatorChange={updateArpeggiator}
          />
        </div>

        <div className="synth-grid-filter">
          <FilterSection 
            type={audioState.filter.type}
            cutoff={audioState.filter.cutoff}
            resonance={audioState.filter.resonance}
            envelopeAmount={audioState.filter.envelopeAmount}
            onTypeChange={(type) => updateFilter({ type })}
            onCutoffChange={(cutoff) => updateFilter({ cutoff })}
            onResonanceChange={(resonance) => updateFilter({ resonance })}
            onEnvelopeAmountChange={(envelopeAmount) => updateFilter({ envelopeAmount })}
          />
        </div>

        <div className="synth-grid-env">
          <EnvelopeSection 
            attack={audioState.envelope.attack}
            decay={audioState.envelope.decay}
            sustain={audioState.envelope.sustain}
            release={audioState.envelope.release}
            onAttackChange={(attack) => updateEnvelope({ attack })}
            onDecayChange={(decay) => updateEnvelope({ decay })}
            onSustainChange={(sustain) => updateEnvelope({ sustain })}
            onReleaseChange={(release) => updateEnvelope({ release })}
          />
        </div>

        {/* Bottom Row: Modulation & Effects */}
        <div className="synth-grid-lfo">
          <LFOSection
            waveform={audioState.lfo.waveform}
            rate={audioState.lfo.rate}
            depth={audioState.lfo.depth}
            targets={audioState.lfo.targets}
            onWaveformChange={(waveform) => updateLFO({ waveform })}
            onRateChange={(rate) => updateLFO({ rate })}
            onDepthChange={(depth) => updateLFO({ depth })}
            onTargetChange={(target, enabled) => updateLFO({ 
              targets: { ...audioState.lfo.targets, [target]: enabled } 
            })}
          />
        </div>

        <div className="synth-grid-fx">
          <ChorusSection
            rate={audioState.chorus.rate}
            depth={audioState.chorus.depth}
            mix={audioState.chorus.mix}
            drive={audioState.chorus.drive}
            onRateChange={(rate) => updateChorus({ rate })}
            onDepthChange={(depth) => updateChorus({ depth })}
            onMixChange={(mix) => updateChorus({ mix })}
            onDriveChange={(drive) => updateChorus({ drive })}
          />
        </div>

        <div className="synth-grid-scopes-master">
          <ScopesMasterSection 
            audioContext={audioContextRef.current}
            analyser={analyser}
            gain={audioState.gain}
            delayTime={audioState.delay.time}
            delayFeedback={audioState.delay.feedback}
            delayMix={audioState.delay.mix}
            onGainChange={updateGain}
            onDelayTimeChange={(time) => updateDelay({ time })}
            onDelayFeedbackChange={(feedback) => updateDelay({ feedback })}
            onDelayMixChange={(mix) => updateDelay({ mix })}
          />
        </div>

        <div className="synth-grid-macro">
          <MacroSection
            macros={audioState.macros}
            onMacroChange={(macro, value) => updateMacros({ [macro]: value })}
          />
        </div>
      </div>

      {/* Legacy Analyzer (hidden for now, can be removed) */}
      <div className="hidden">
        <Analyzer audioContext={audioContextRef.current} />
      </div>
    </div>
  )
}
