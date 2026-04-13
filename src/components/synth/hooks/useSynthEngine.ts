import { useState, useRef, useEffect } from 'react'

export interface AudioState {
  oscillator: {
    waveform: OscillatorType
    waveform2?: OscillatorType
    mix1: number
    mix2: number
    tune1?: number // semitones
    tune2?: number // semitones
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
  }
  filter: {
    type: BiquadFilterType
    cutoff: number
    resonance: number
    envelopeAmount: number
    keyTracking: number
  }
  envelope: {
    attack: number
    decay: number
    sustain: number
    release: number
  }
  filterEnvelope: {
    attack: number
    decay: number
    sustain: number
    release: number
  }
  lfo: {
    waveform: OscillatorType
    rate: number
    depth: number
    targets: {
      pitch: boolean
      cutoff: boolean
      pulseWidth: boolean
      amp: boolean
    }
  }
  gain: number
  delay: {
    time: number
    feedback: number
    mix: number
  }
  chorus: {
    rate: number
    depth: number
    mix: number
    drive: number
  }
  arpeggiator: {
    enabled: boolean
    rate: number
    pattern: 'up' | 'down' | 'upDown' | 'random'
    octaveRange: number
    gate: number
    hold: boolean
  }
  macros: {
    1: number
    2: number
    3: number
    4: number
  }
  performance: {
    maxPolyphony: number
    voiceStealing: boolean
  }
}

export interface Voice {
  id: string
  oscillators1: OscillatorNode[]
  oscillators2: OscillatorNode[]
  osc1GainNode: GainNode
  osc2GainNode: GainNode
  preDriveGain: GainNode
  waveshaper: WaveShaperNode
  filter: BiquadFilterNode
  gainNode: GainNode
  envelopeGain: GainNode
  filterEnvelopeGain: GainNode
  note: string
  baseFrequency: number
  velocity: number
  startTime: number
  isReleased: boolean
}

export function useSynthEngine(audioContext: AudioContext | null) {
  const [audioState, setAudioState] = useState<AudioState>({
    oscillator: { 
      waveform: 'sawtooth',
      waveform2: 'square',
      mix1: 0.5,
      mix2: 0.5,
      tune1: 0,
      tune2: 0,
      enabled1: true,
      enabled2: false,
      unison: { enabled: true, voices: 3, detune: 0.1 },
      glide: { enabled: false, time: 0.1, legato: true }
    },
    filter: { type: 'lowpass', cutoff: 4000, resonance: 1, envelopeAmount: 0.5, keyTracking: 0.0 },
    envelope: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 0.5 },
    filterEnvelope: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 0.5 },
    lfo: { 
      waveform: 'sine', 
      rate: 2, 
      depth: 0.5, 
      targets: { pitch: false, cutoff: true, pulseWidth: false, amp: false } 
    },
    gain: 0.3,
    delay: { time: 0.3, feedback: 0.3, mix: 0.3 },
    chorus: { rate: 1.5, depth: 0.5, mix: 0.3, drive: 0.0 },
    arpeggiator: { enabled: false, rate: 60, pattern: 'upDown', octaveRange: 1, gate: 0.5, hold: false },
    macros: { 1: 0.5, 2: 0.5, 3: 0.5, 4: 0.5 },
    performance: { maxPolyphony: 8, voiceStealing: true }
  })

  const [isPlaying, setIsPlaying] = useState(false)
  
  const voicesRef = useRef<Map<string, Voice>>(new Map())
  const masterGainRef = useRef<GainNode | null>(null)
  const filterRef = useRef<BiquadFilterNode | null>(null)
  const fxBusRef = useRef<GainNode | null>(null)
  const fxPreDriveGainRef = useRef<GainNode | null>(null)
  const fxWaveshaperRef = useRef<WaveShaperNode | null>(null)
  const delayRef = useRef<DelayNode | null>(null)
  const delayFeedbackRef = useRef<GainNode | null>(null)
  const delayGainRef = useRef<GainNode | null>(null)
  const chorusRef = useRef<any>(null)
  const chorusGainRef = useRef<GainNode | null>(null)
  const lfoRef = useRef<OscillatorNode | null>(null)
  const lfoGainRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const lastNoteRef = useRef<{ note: string; frequency: number } | null>(null)
  
  // Arpeggiator state
  const arpNotesRef = useRef<string[]>([])
  const arpCurrentIndexRef = useRef<number>(0)
  const arpTimerRef = useRef<number | null>(null)
  const arpHeldNotesRef = useRef<Set<string>>(new Set())

  // Initialize audio nodes
  useEffect(() => {
    if (!audioContext) return

    // Create master gain
    masterGainRef.current = audioContext.createGain()
    masterGainRef.current.gain.value = audioState.gain

    // Create main filter
    filterRef.current = audioContext.createBiquadFilter()
    filterRef.current.type = audioState.filter.type
    filterRef.current.frequency.value = audioState.filter.cutoff
    filterRef.current.Q.value = audioState.filter.resonance

    // Create FX bus and drive stage (FX)
    fxBusRef.current = audioContext.createGain()
    fxBusRef.current.gain.value = 1

    fxPreDriveGainRef.current = audioContext.createGain()
    fxPreDriveGainRef.current.gain.value = 1 + (audioState.chorus.drive || 0) * 4

    fxWaveshaperRef.current = audioContext.createWaveShaper()
    fxWaveshaperRef.current.curve = createDriveCurve(audioState.chorus.drive || 0)
    fxWaveshaperRef.current.oversample = '4x'

    // Create delay effect
    delayRef.current = audioContext.createDelay(1.0)
    delayRef.current.delayTime.value = audioState.delay.time
    
    delayFeedbackRef.current = audioContext.createGain()
    delayFeedbackRef.current.gain.value = audioState.delay.feedback
    
    delayGainRef.current = audioContext.createGain()
    delayGainRef.current.gain.value = audioState.delay.mix

    // Create chorus effect
    chorusGainRef.current = audioContext.createGain()
    chorusGainRef.current.gain.value = audioState.chorus.mix

    // Create LFO
    lfoRef.current = audioContext.createOscillator()
    lfoRef.current.type = audioState.lfo.waveform
    lfoRef.current.frequency.value = audioState.lfo.rate
    lfoRef.current.start()
    
    lfoGainRef.current = audioContext.createGain()
    lfoGainRef.current.gain.value = audioState.lfo.depth

    // Create analyser
    analyserRef.current = audioContext.createAnalyser()
    analyserRef.current.fftSize = 2048

    // Connect delay feedback loop
    delayRef.current.connect(delayFeedbackRef.current)
    delayFeedbackRef.current.connect(delayRef.current)

    // Connect main signal chain
    filterRef.current.connect(masterGainRef.current)
    masterGainRef.current.connect(audioContext.destination)
    
    // FX bus chain: fxBus -> drive -> shaper -> delay -> delay gain -> destination
    fxBusRef.current.connect(fxPreDriveGainRef.current)
    fxPreDriveGainRef.current.connect(fxWaveshaperRef.current)
    fxWaveshaperRef.current.connect(delayRef.current)
    delayRef.current.connect(delayGainRef.current)
    delayGainRef.current.connect(audioContext.destination)

    return () => {
      // Stop arpeggiator
      stopArpeggiator()
      
      // Clean up all voices
      const voices = voicesRef.current
      voices.forEach(voice => {
        voice.oscillators1.forEach(osc => {
          try { osc.stop() } catch {}
          try { osc.disconnect() } catch {}
        })
        voice.oscillators2.forEach(osc => {
          try { osc.stop() } catch {}
          try { osc.disconnect() } catch {}
        })
        try { voice.preDriveGain.disconnect() } catch {}
        try { voice.waveshaper.disconnect() } catch {}
        voice.filter.disconnect()
        voice.gainNode.disconnect()
        voice.envelopeGain.disconnect()
        voice.filterEnvelopeGain.disconnect()
        voice.osc1GainNode.disconnect()
        voice.osc2GainNode.disconnect()
      })
      voices.clear()

      // Clean up master nodes
      const chorus = chorusRef.current
      masterGainRef.current?.disconnect()
      filterRef.current?.disconnect()
      fxBusRef.current?.disconnect()
      fxPreDriveGainRef.current?.disconnect()
      fxWaveshaperRef.current?.disconnect()
      delayRef.current?.disconnect()
      delayFeedbackRef.current?.disconnect()
      delayGainRef.current?.disconnect()
      chorus?.disconnect()
      chorusGainRef.current?.disconnect()
      lfoRef.current?.disconnect()
      lfoGainRef.current?.disconnect()
      analyserRef.current?.disconnect()
    }
  }, [audioContext])

  // Update audio parameters when state changes
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = audioState.gain
    }
    if (filterRef.current) {
      filterRef.current.type = audioState.filter.type
      filterRef.current.frequency.value = audioState.filter.cutoff
      filterRef.current.Q.value = audioState.filter.resonance
    }
    if (delayRef.current && delayFeedbackRef.current) {
      delayRef.current.delayTime.value = audioState.delay.time
      delayFeedbackRef.current.gain.value = audioState.delay.feedback
    }
    if (delayGainRef.current) {
      delayGainRef.current.gain.value = audioState.delay.mix
    }
    if (chorusGainRef.current) {
      chorusGainRef.current.gain.value = audioState.chorus.mix
    }
    if (fxPreDriveGainRef.current && fxWaveshaperRef.current) {
      const drive = Math.max(0, Math.min(1, audioState.chorus.drive || 0))
      fxPreDriveGainRef.current.gain.value = 1 + drive * 4
      fxWaveshaperRef.current.curve = createDriveCurve(drive)
    }
    if (lfoRef.current && lfoGainRef.current) {
      lfoRef.current.type = audioState.lfo.waveform
      lfoRef.current.frequency.value = audioState.lfo.rate
      lfoGainRef.current.gain.value = audioState.lfo.depth
    }
  }, [
    audioState.gain,
    audioState.filter.type,
    audioState.filter.cutoff,
    audioState.filter.resonance,
    audioState.delay.time,
    audioState.delay.feedback,
    audioState.delay.mix,
    audioState.chorus.mix,
    audioState.chorus.drive,
    audioState.lfo.waveform,
    audioState.lfo.rate,
    audioState.lfo.depth
  ])

  const noteToFrequency = (note: string): number => {
    // Base frequencies for octave 4 (the reference octave)
    const baseFrequencies: Record<string, number> = {
      'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
      'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
      'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
    }
    
    // Parse the note name and octave
    const match = note.match(/^([A-G]#?)(\d+)$/)
    if (!match) return 440 // Default to A4 if note format is invalid
    
    const noteName = match[1]
    const octave = parseInt(match[2], 10)
    const baseFrequency = baseFrequencies[noteName]
    
    if (!baseFrequency) return 440 // Default to A4 if note not found
    
    // Calculate frequency using the formula: f = f0 * 2^(octave - 4)
    return baseFrequency * Math.pow(2, octave - 4)
  }

  // Utility: create a waveshaper curve for drive
  const createDriveCurve = (amount: number, nSamples = 2048): Float32Array<ArrayBuffer> => {
    const k = amount * 5 // 0..5
    const curve = new Float32Array(nSamples)
    for (let i = 0; i < nSamples; i++) {
      const x = (i * 2) / nSamples - 1
      curve[i] = (1 + k) * x / (1 + k * Math.abs(x))
    }
    return curve as Float32Array<ArrayBuffer>
  }

  // Utility: key tracking mapping (relative to C4)
  const applyKeyTracking = (baseCutoff: number, keyTracking: number, baseFrequency: number): number => {
    const ref = 261.63 // C4
    const ratio = baseFrequency / ref
    const tracked = baseCutoff * Math.pow(ratio, keyTracking)
    return Math.max(20, Math.min(20000, tracked))
  }

  // Arpeggiator utilities
  const getArpNoteFrequencies = (baseNotes: string[]): string[] => {
    const { octaveRange } = audioState.arpeggiator
    const allNotes: string[] = []
    
    // Sort base notes by frequency first
    const sortedBaseNotes = [...baseNotes].sort((a, b) => {
      const freqA = noteToFrequency(a)
      const freqB = noteToFrequency(b)
      return freqA - freqB
    })
    
    // Generate notes across octave range
    sortedBaseNotes.forEach(baseNote => {
      const [noteName, octave] = baseNote.split(/(\d+)/).filter(Boolean)
      const baseOctave = parseInt(octave)
      
      for (let oct = 0; oct < octaveRange; oct++) {
        allNotes.push(`${noteName}${baseOctave + oct}`)
      }
    })
    
    return allNotes
  }

  const getArpPatternNotes = (baseNotes: string[]): string[] => {
    const { pattern } = audioState.arpeggiator
    const sortedNotes = getArpNoteFrequencies(baseNotes)
    
    switch (pattern) {
      case 'up':
        return sortedNotes
      case 'down':
        return [...sortedNotes].reverse()
      case 'upDown':
        if (sortedNotes.length <= 1) return sortedNotes
        return [...sortedNotes, ...sortedNotes.slice(1, -1).reverse()]
      case 'random':
        const shuffled = [...sortedNotes]
        // Fisher-Yates shuffle for better randomization
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
      default:
        return sortedNotes
    }
  }

  const startArpeggiator = () => {
    if (arpTimerRef.current !== null) return
    
    const { rate, gate } = audioState.arpeggiator
    const interval = 60000 / rate / 4 // Convert rate (BPM) to interval (ms)
    
    const playNextArpNote = () => {
      if (arpNotesRef.current.length === 0) {
        stopArpeggiator()
        return
      }
      
      const currentNote = arpNotesRef.current[arpCurrentIndexRef.current]
      
      // Play note through arpeggiator (not direct)
      _playNoteDirect(currentNote, 0.8)
      
      // Schedule note release
      setTimeout(() => {
        _releaseNoteDirect(currentNote)
      }, interval * gate)
      
      // Move to next note
      arpCurrentIndexRef.current = (arpCurrentIndexRef.current + 1) % arpNotesRef.current.length
      
      // For random pattern, regenerate on each cycle
      if (audioState.arpeggiator.pattern === 'random' && arpCurrentIndexRef.current === 0) {
        arpNotesRef.current = getArpPatternNotes(Array.from(arpHeldNotesRef.current))
      }
      
      // Schedule next note
      arpTimerRef.current = window.setTimeout(playNextArpNote, interval)
    }
    
    // Generate initial pattern and start
    arpNotesRef.current = getArpPatternNotes(Array.from(arpHeldNotesRef.current))
    arpCurrentIndexRef.current = 0
    playNextArpNote()
  }

  const stopArpeggiator = () => {
    if (arpTimerRef.current !== null) {
      clearTimeout(arpTimerRef.current)
      arpTimerRef.current = null
    }
    arpNotesRef.current = []
    arpCurrentIndexRef.current = 0
  }

  const updateArpeggiatorNotes = () => {
    if (!audioState.arpeggiator.enabled) {
      stopArpeggiator()
      return
    }
    
    if (arpHeldNotesRef.current.size === 0) {
      stopArpeggiator()
      return
    }
    
    // Generate new pattern and reset index
    const newPattern = getArpPatternNotes(Array.from(arpHeldNotesRef.current))
    arpNotesRef.current = newPattern
    arpCurrentIndexRef.current = 0
    
    // If arpeggiator is not running, start it
    if (arpTimerRef.current === null) {
      startArpeggiator()
    }
  }

  const getVoiceToSteal = (): string | null => {
    if (!audioState.performance.voiceStealing) return null
    
    const activeVoices = Array.from(voicesRef.current.entries())
    if (activeVoices.length < audioState.performance.maxPolyphony) return null
    
    // Find voice with lowest velocity or oldest note
    let voiceToSteal = activeVoices[0]
    for (const [note, voice] of activeVoices) {
      if (voice.velocity < voiceToSteal[1].velocity) {
        voiceToSteal = [note, voice]
      }
    }
    
    return voiceToSteal[0]
  }

  const createUnisonOscillatorsForWaveform = (
    ac: AudioContext,
    baseFrequency: number,
    detune: number,
    waveform: OscillatorType,
    baseTuneCents: number
  ): OscillatorNode[] => {
    const oscillators: OscillatorNode[] = []
    const unisonVoices = audioState.oscillator.unison.enabled ? audioState.oscillator.unison.voices : 1

    for (let i = 0; i < unisonVoices; i++) {
      const osc = ac.createOscillator()
      osc.type = waveform

      if (unisonVoices > 1) {
        const detuneAmount = (i - (unisonVoices - 1) / 2) * detune * 100 // cents
        osc.detune.value = detuneAmount + baseTuneCents
      } else {
        osc.detune.value = baseTuneCents
      }

      osc.frequency.value = baseFrequency
      oscillators.push(osc)
    }

    return oscillators
  }

  const _playNoteDirect = (note: string, velocity: number = 0.8) => {
    if (!audioContext) return

    const baseFrequency = noteToFrequency(note)
    const now = audioContext.currentTime

    // Handle glide/portamento
    let targetFrequency = baseFrequency
    if (audioState.oscillator.glide.enabled && lastNoteRef.current) {
      if (audioState.oscillator.glide.legato && voicesRef.current.size > 0) {
        targetFrequency = lastNoteRef.current.frequency
      }
    }

    // Check for voice stealing
    const voiceToSteal = getVoiceToSteal()
    if (voiceToSteal) {
      _releaseNoteDirect(voiceToSteal)
    }

    // Create voice ID
    const voiceId = `${note}-${Date.now()}-${Math.random()}`

    // Create voice nodes - only create oscillators if enabled
    const oscillators1 = audioState.oscillator.enabled1 
      ? createUnisonOscillatorsForWaveform(
          audioContext,
          targetFrequency,
          audioState.oscillator.unison.detune,
          audioState.oscillator.waveform,
          (audioState.oscillator.tune1 || 0) * 100
        )
      : []
    
    const oscillators2 = audioState.oscillator.enabled2 
      ? createUnisonOscillatorsForWaveform(
          audioContext,
          targetFrequency,
          audioState.oscillator.unison.detune,
          audioState.oscillator.waveform2 || audioState.oscillator.waveform,
          (audioState.oscillator.tune2 || 0) * 100
        )
      : []
    const preDriveGain = audioContext.createGain()
    const waveshaper = audioContext.createWaveShaper()
    const filter = audioContext.createBiquadFilter()
    const gainNode = audioContext.createGain()
    const envelopeGain = audioContext.createGain()
    const filterEnvelopeGain = audioContext.createGain()

    // Configure filter for this voice
    filter.type = audioState.filter.type
    const effectiveCutoff = applyKeyTracking(
      audioState.filter.cutoff,
      audioState.filter.keyTracking,
      baseFrequency
    )
    filter.frequency.value = effectiveCutoff
    filter.Q.value = audioState.filter.resonance

    // Pre-filter drive removed (moved to FX bus): keep neutral
    preDriveGain.gain.value = 1
    waveshaper.curve = createDriveCurve(0)
    waveshaper.oversample = '4x'

    // Configure amp envelope
    envelopeGain.gain.setValueAtTime(0, now)
    envelopeGain.gain.linearRampToValueAtTime(velocity, now + audioState.envelope.attack * velocity)
    envelopeGain.gain.linearRampToValueAtTime(audioState.envelope.sustain * velocity, now + audioState.envelope.attack * velocity + audioState.envelope.decay)

    // Configure filter envelope
    filterEnvelopeGain.gain.setValueAtTime(0, now)
    filterEnvelopeGain.gain.linearRampToValueAtTime(1, now + audioState.filterEnvelope.attack)
    filterEnvelopeGain.gain.linearRampToValueAtTime(audioState.filterEnvelope.sustain, now + audioState.filterEnvelope.attack + audioState.filterEnvelope.decay)

    // Group mixers to normalize unison within each oscillator group
    const groupMixer1 = audioContext.createGain()
    const groupMixer2 = audioContext.createGain()
    const unisonVoices = audioState.oscillator.unison.enabled ? audioState.oscillator.unison.voices : 1
    groupMixer1.gain.value = 1 / unisonVoices
    groupMixer2.gain.value = 1 / unisonVoices

    oscillators1.forEach(osc => {
      osc.connect(groupMixer1)
      osc.start(now)
    })
    oscillators2.forEach(osc => {
      osc.connect(groupMixer2)
      osc.start(now)
    })

    // Crossfade between osc1 and osc2 using mix
    const osc1GainNode = audioContext.createGain()
    const osc2GainNode = audioContext.createGain()
    const mix1 = Math.max(0, Math.min(1, audioState.oscillator.mix1))
    const mix2 = Math.max(0, Math.min(1, audioState.oscillator.mix2))
    osc1GainNode.gain.value = mix1
    osc2GainNode.gain.value = mix2

    // Only connect enabled oscillators
    if (audioState.oscillator.enabled1 && oscillators1.length > 0) {
      groupMixer1.connect(osc1GainNode)
      osc1GainNode.connect(preDriveGain)
    }
    
    if (audioState.oscillator.enabled2 && oscillators2.length > 0) {
      groupMixer2.connect(osc2GainNode)
      osc2GainNode.connect(preDriveGain)
    }
    preDriveGain.connect(waveshaper)
    waveshaper.connect(filter)

    // Continue chain
    filter.connect(envelopeGain)
    envelopeGain.connect(gainNode)
    
    // Apply filter envelope modulation
    filterEnvelopeGain.connect(filter.frequency)
    
    // Connect to main signal chain
    gainNode.connect(filterRef.current!)
    // Send to FX bus (for delay/drive etc.)
    gainNode.connect(fxBusRef.current!)
    gainNode.connect(analyserRef.current!)

    // Handle glide if enabled
    if (audioState.oscillator.glide.enabled && lastNoteRef.current && targetFrequency !== baseFrequency) {
      // Apply glide to enabled oscillators only
      if (audioState.oscillator.enabled1) {
        oscillators1.forEach(osc => {
          osc.frequency.cancelScheduledValues(now)
          osc.frequency.setValueAtTime(targetFrequency, now)
          osc.frequency.exponentialRampToValueAtTime(baseFrequency, now + audioState.oscillator.glide.time)
        })
      }
      if (audioState.oscillator.enabled2) {
        oscillators2.forEach(osc => {
          osc.frequency.cancelScheduledValues(now)
          osc.frequency.setValueAtTime(targetFrequency, now)
          osc.frequency.exponentialRampToValueAtTime(baseFrequency, now + audioState.oscillator.glide.time)
        })
      }
    }

    // Store voice
    const voice: Voice = {
      id: voiceId,
      oscillators1,
      oscillators2,
      osc1GainNode,
      osc2GainNode,
      preDriveGain,
      waveshaper,
      filter,
      gainNode,
      envelopeGain,
      filterEnvelopeGain,
      note,
      baseFrequency,
      velocity,
      startTime: now,
      isReleased: false
    }
    voicesRef.current.set(voiceId, voice)
    lastNoteRef.current = { note, frequency: baseFrequency }

    setIsPlaying(true)
  }

  const playNote = (note: string, velocity: number = 0.8) => {
    if (!audioContext) return

    // Handle arpeggiator mode
    if (audioState.arpeggiator.enabled) {
      arpHeldNotesRef.current.add(note)
      // Always update arpeggiator notes when a new note is pressed
      updateArpeggiatorNotes()
      return
    }

    _playNoteDirect(note, velocity)
  }

  const _releaseNoteDirect = (note: string) => {
    if (!audioContext) return

    // Find voice(s) for this note
    const voicesToRemove: string[] = []
    voicesRef.current.forEach((voice, voiceId) => {
      if (voice.note === note && !voice.isReleased) {
        voicesToRemove.push(voiceId)
      }
    })

    if (voicesToRemove.length === 0) return

    const now = audioContext.currentTime

    voicesToRemove.forEach(voiceId => {
      const voice = voicesRef.current.get(voiceId)!
      if (!voice) return

      voice.isReleased = true

      // Apply release envelope
      const currentGain = voice.envelopeGain.gain.value
      voice.envelopeGain.gain.cancelScheduledValues(now)
      voice.envelopeGain.gain.setValueAtTime(currentGain, now)
      voice.envelopeGain.gain.linearRampToValueAtTime(0, now + audioState.envelope.release)

      // Apply filter envelope release
      const currentFilterGain = voice.filterEnvelopeGain.gain.value
      voice.filterEnvelopeGain.gain.cancelScheduledValues(now)
      voice.filterEnvelopeGain.gain.setValueAtTime(currentFilterGain, now)
      voice.filterEnvelopeGain.gain.linearRampToValueAtTime(0, now + audioState.filterEnvelope.release)

      // Stop oscillators after release
      voice.oscillators1.forEach(osc => {
        osc.stop(now + Math.max(audioState.envelope.release, audioState.filterEnvelope.release))
      })
      voice.oscillators2.forEach(osc => {
        osc.stop(now + Math.max(audioState.envelope.release, audioState.filterEnvelope.release))
      })

      // Clean up voice
      setTimeout(() => {
        voice.oscillators1.forEach(osc => osc.disconnect())
        voice.oscillators2.forEach(osc => osc.disconnect())
        try { voice.preDriveGain.disconnect() } catch {}
        try { voice.waveshaper.disconnect() } catch {}
        voice.filter.disconnect()
        voice.gainNode.disconnect()
        voice.envelopeGain.disconnect()
        voice.filterEnvelopeGain.disconnect()
        voice.osc1GainNode.disconnect()
        voice.osc2GainNode.disconnect()
        voicesRef.current.delete(voiceId)

        if (voicesRef.current.size === 0) {
          setIsPlaying(false)
        }
      }, Math.max(audioState.envelope.release, audioState.filterEnvelope.release) * 1000)
    })
  }

  const releaseNote = (note: string) => {
    if (!audioContext) return

    // Handle arpeggiator mode
    if (audioState.arpeggiator.enabled) {
      arpHeldNotesRef.current.delete(note)
      
      // If hold is off, update arpeggiator immediately
      if (!audioState.arpeggiator.hold) {
        updateArpeggiatorNotes()
      }
      // If hold is on but no notes remain, stop arpeggiator
      else if (arpHeldNotesRef.current.size === 0) {
        stopArpeggiator()
      }
      // If hold is on and notes remain, do nothing (keep playing)
      
      return
    }

    _releaseNoteDirect(note)
  }

  const updateOscillator = (updates: Partial<AudioState['oscillator']>) => {
    const prev = audioState
    const next = { ...prev.oscillator, ...updates }
    const tune1DeltaCents = (typeof updates.tune1 === 'number' ? (updates.tune1 - (prev.oscillator.tune1 || 0)) * 100 : 0)
    const tune2DeltaCents = (typeof updates.tune2 === 'number' ? (updates.tune2 - (prev.oscillator.tune2 || 0)) * 100 : 0)

    setAudioState({
      ...prev,
      oscillator: next
    })

    // Update active oscillators
    voicesRef.current.forEach(voice => {
      // Handle oscillator enable/disable
      if (typeof updates.enabled1 === 'boolean') {
        if (updates.enabled1 && voice.oscillators1.length === 0) {
          // Enable oscillator 1 - create new oscillators
          const now = audioContext?.currentTime ?? 0
          const newOscillators = createUnisonOscillatorsForWaveform(
            audioContext!,
            voice.baseFrequency,
            next.unison.detune,
            next.waveform,
            (next.tune1 || 0) * 100
          )
          newOscillators.forEach(osc => {
            osc.start(now)
            osc.connect(voice.osc1GainNode)
          })
          voice.oscillators1 = newOscillators
          
          // Connect to the signal chain if mix > 0
          if (next.mix1 > 0) {
            voice.osc1GainNode.connect(voice.preDriveGain)
          }
        } else if (!updates.enabled1 && voice.oscillators1.length > 0) {
          // Disable oscillator 1 - stop and disconnect existing oscillators
          const now = audioContext?.currentTime ?? 0
          voice.oscillators1.forEach(osc => {
            try {
              osc.stop(now)
              osc.disconnect()
            } catch (e) {
              console.warn('Error stopping oscillator 1:', e)
            }
          })
          voice.oscillators1 = []
          voice.osc1GainNode.disconnect()
        }
      }

      if (typeof updates.enabled2 === 'boolean') {
        if (updates.enabled2 && voice.oscillators2.length === 0) {
          // Enable oscillator 2 - create new oscillators
          const now = audioContext?.currentTime ?? 0
          const newOscillators = createUnisonOscillatorsForWaveform(
            audioContext!,
            voice.baseFrequency,
            next.unison.detune,
            next.waveform2 || next.waveform,
            (next.tune2 || 0) * 100
          )
          newOscillators.forEach(osc => {
            osc.start(now)
            osc.connect(voice.osc2GainNode)
          })
          voice.oscillators2 = newOscillators
          
          // Connect to the signal chain if mix > 0
          if (next.mix2 > 0) {
            voice.osc2GainNode.connect(voice.preDriveGain)
          }
        } else if (!updates.enabled2 && voice.oscillators2.length > 0) {
          // Disable oscillator 2 - stop and disconnect existing oscillators
          const now = audioContext?.currentTime ?? 0
          voice.oscillators2.forEach(osc => {
            try {
              osc.stop(now)
              osc.disconnect()
            } catch (e) {
              console.warn('Error stopping oscillator 2:', e)
            }
          })
          voice.oscillators2 = []
          voice.osc2GainNode.disconnect()
        }
      }

      // Handle other updates (waveform, mix, tune) only for enabled oscillators
      if (updates.waveform && next.enabled1) {
        voice.oscillators1.forEach(osc => {
          osc.type = updates.waveform as OscillatorType
        })
      }
      if (updates.waveform2 && next.enabled2) {
        voice.oscillators2.forEach(osc => {
          osc.type = updates.waveform2 as OscillatorType
        })
      }
      if (typeof (updates as any).mix1 === 'number') {
        const mix1 = Math.max(0, Math.min(1, (updates as any).mix1))
        voice.osc1GainNode.gain.value = mix1
        // Handle connection/disconnection based on mix
        if (mix1 > 0 && next.enabled1 && voice.oscillators1.length > 0) {
          voice.osc1GainNode.connect(voice.preDriveGain)
        } else if (mix1 === 0) {
          voice.osc1GainNode.disconnect()
        }
      }
      if (typeof (updates as any).mix2 === 'number') {
        const mix2 = Math.max(0, Math.min(1, (updates as any).mix2))
        voice.osc2GainNode.gain.value = mix2
        // Handle connection/disconnection based on mix
        if (mix2 > 0 && next.enabled2 && voice.oscillators2.length > 0) {
          voice.osc2GainNode.connect(voice.preDriveGain)
        } else if (mix2 === 0) {
          voice.osc2GainNode.disconnect()
        }
      }
      if (tune1DeltaCents !== 0 && next.enabled1) {
        const now = audioContext?.currentTime ?? 0
        voice.oscillators1.forEach(osc => {
          osc.detune.setValueAtTime(osc.detune.value + tune1DeltaCents, now)
        })
      }
      if (tune2DeltaCents !== 0 && next.enabled2) {
        const now = audioContext?.currentTime ?? 0
        voice.oscillators2.forEach(osc => {
          osc.detune.setValueAtTime(osc.detune.value + tune2DeltaCents, now)
        })
      }
    })
  }

  const updateFilter = (updates: Partial<AudioState['filter']>) => {
    setAudioState(prev => ({
      ...prev,
      filter: { ...prev.filter, ...updates }
    }))

    // Apply updates to active voices immediately
    voicesRef.current.forEach(voice => {
      if (updates.type) {
        voice.filter.type = updates.type
      }
      if (typeof updates.resonance === 'number') {
        voice.filter.Q.value = updates.resonance
      }
      if (typeof updates.cutoff === 'number' || typeof updates.keyTracking === 'number') {
        const baseCutoff = typeof updates.cutoff === 'number' ? updates.cutoff : audioState.filter.cutoff
        const keyTrack = typeof updates.keyTracking === 'number' ? updates.keyTracking : audioState.filter.keyTracking
        const eff = applyKeyTracking(baseCutoff, keyTrack, voice.baseFrequency)
        voice.filter.frequency.value = eff
      }
    })
  }

  const updateEnvelope = (updates: Partial<AudioState['envelope']>) => {
    setAudioState(prev => ({
      ...prev,
      envelope: { ...prev.envelope, ...updates }
    }))
  }

  const updateGain = (gain: number) => {
    setAudioState(prev => ({ ...prev, gain }))
  }

  const updateDelay = (updates: Partial<AudioState['delay']>) => {
    setAudioState(prev => ({
      ...prev,
      delay: { ...prev.delay, ...updates }
    }))
  }

  const updateFilterEnvelope = (updates: Partial<AudioState['filterEnvelope']>) => {
    setAudioState(prev => ({
      ...prev,
      filterEnvelope: { ...prev.filterEnvelope, ...updates }
    }))
  }

  const updateLFO = (updates: Partial<AudioState['lfo']>) => {
    setAudioState(prev => ({
      ...prev,
      lfo: { ...prev.lfo, ...updates }
    }))
  }

  const updateChorus = (updates: Partial<AudioState['chorus']>) => {
    setAudioState(prev => ({
      ...prev,
      chorus: { ...prev.chorus, ...updates }
    }))

    // Apply FX drive updates immediately
    if (typeof updates.drive === 'number') {
      const drive = Math.max(0, Math.min(1, updates.drive))
      if (fxPreDriveGainRef.current) fxPreDriveGainRef.current.gain.value = 1 + drive * 4
      if (fxWaveshaperRef.current) fxWaveshaperRef.current.curve = createDriveCurve(drive)
    }
  }

  const updateArpeggiator = (updates: Partial<AudioState['arpeggiator']>) => {
    const prevArpState = audioState.arpeggiator
    const nextArpState = { ...prevArpState, ...updates }
    
    setAudioState(prev => ({
      ...prev,
      arpeggiator: nextArpState
    }))

    // Handle arpeggiator state changes
    if (typeof updates.enabled === 'boolean') {
      if (!updates.enabled) {
        stopArpeggiator()
        // Clear held notes
        arpHeldNotesRef.current.clear()
      } else if (updates.enabled && arpHeldNotesRef.current.size > 0) {
        updateArpeggiatorNotes()
      }
    }

    // Update running arpeggiator if parameters changed
    if (updates.pattern !== undefined || updates.rate !== undefined || 
        updates.octaveRange !== undefined || updates.gate !== undefined) {
      if (nextArpState.enabled && arpHeldNotesRef.current.size > 0) {
        updateArpeggiatorNotes()
      }
    }
  }

  const updateMacros = (updates: Partial<AudioState['macros']>) => {
    setAudioState(prev => ({
      ...prev,
      macros: { ...prev.macros, ...updates }
    }))
  }

  const updatePerformance = (updates: Partial<AudioState['performance']>) => {
    setAudioState(prev => ({
      ...prev,
      performance: { ...prev.performance, ...updates }
    }))
  }

  const panic = () => {
    // Stop all notes immediately
    voicesRef.current.forEach((voice, voiceId) => {
      const allOscs = [...voice.oscillators1, ...voice.oscillators2]
      allOscs.forEach(osc => {
        osc.stop()
        osc.disconnect()
      })
      voice.filter.disconnect()
      voice.gainNode.disconnect()
      voice.envelopeGain.disconnect()
      voice.filterEnvelopeGain.disconnect()
      voice.osc1GainNode.disconnect()
      voice.osc2GainNode.disconnect()
    })
    voicesRef.current.clear()
    setIsPlaying(false)
    lastNoteRef.current = null
  }

  const getFactoryPresets = () => [
    {
      name: "Init Patch",
      state: {
        oscillator: { 
          waveform: 'sawtooth' as OscillatorType,
          waveform2: 'square' as OscillatorType,
          mix1: 0.5,
          mix2: 0.5,
          tune1: 0,
          tune2: 0,
          enabled1: true,
          enabled2: false,
          unison: { enabled: true, voices: 3, detune: 0.1 },
          glide: { enabled: false, time: 0.1, legato: true }
        },
        filter: { type: 'lowpass' as BiquadFilterType, cutoff: 4000, resonance: 1, envelopeAmount: 0.5, keyTracking: 0.0 },
        envelope: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 0.5 },
        filterEnvelope: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 0.5 },
        lfo: { 
          waveform: 'sine' as OscillatorType, 
          rate: 2, 
          depth: 0.5, 
          targets: { pitch: false, cutoff: true, pulseWidth: false, amp: false } 
        },
        gain: 0.3,
        delay: { time: 0.3, feedback: 0.3, mix: 0.3 },
        chorus: { rate: 1.5, depth: 0.5, mix: 0.3, drive: 0.0 },
        macros: { 1: 0.5, 2: 0.5, 3: 0.5, 4: 0.5 },
        performance: { maxPolyphony: 8, voiceStealing: true }
      }
    },
    {
      name: "Fat Lead",
      state: {
        oscillator: { 
          waveform: 'sawtooth' as OscillatorType,
          waveform2: 'square' as OscillatorType,
          mix1: 0.4,
          mix2: 0.6,
          tune1: 0,
          tune2: 0,
          enabled1: true,
          enabled2: true,
          unison: { enabled: true, voices: 4, detune: 0.2 },
          glide: { enabled: false, time: 0.1, legato: true }
        },
        filter: { type: 'lowpass' as BiquadFilterType, cutoff: 800, resonance: 1.5, envelopeAmount: 0.7, keyTracking: 0.0 },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.3 },
        filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.2 },
        lfo: { 
          waveform: 'sine' as OscillatorType, 
          rate: 4, 
          depth: 0.3, 
          targets: { pitch: false, cutoff: true, pulseWidth: false, amp: false } 
        },
        gain: 0.4,
        delay: { time: 0.25, feedback: 0.4, mix: 0.2 },
        chorus: { rate: 2, depth: 0.6, mix: 0.4, drive: 0.2 },
        macros: { 1: 0.7, 2: 0.3, 3: 0.8, 4: 0.2 },
        performance: { maxPolyphony: 6, voiceStealing: true }
      }
    }
    // Add more presets as needed
  ]

  return {
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
    voices: voicesRef.current,
    analyser: analyserRef.current,
    getFactoryPresets
  }
}
