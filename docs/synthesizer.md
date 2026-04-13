# Synthesizer Component: Web Audio Guide

This document maps the synthesizer’s UI to its Web Audio graph and behavior. It focuses on concrete API usage, signal flow, scheduling, and current gaps.

## Locations

- UI entry: `src/app/synth/page.tsx` renders `HybridSynth`.
- Main shell: `src/components/synth/HybridSynth.tsx` (power, panic, grid layout).
- Engine: `src/components/synth/hooks/useSynthEngine.ts` (Web Audio graph/state).
- UI blocks: `src/components/synth/components/*` (oscillator, filter, envelope, LFO, FX, keyboard, scopes).

## Lifecycle & Autoplay

- Audio boot: `HybridSynth` creates `AudioContext` on the power button click, then calls `audioContext.resume()` if needed (browser autoplay policies).
- Note entry: `useKeyboardControls` maps keys to notes; `Keyboard` supports mouse/touch with visual feedback.
- Panic: stops and disconnects all active voices immediately.

## Signal Flow

Per‑voice chain (constructed on note on):

- `OscillatorNode` × N (unison) → per‑voice `BiquadFilterNode` → per‑voice mixer `GainNode` → amp envelope `GainNode` → per‑voice `GainNode` → shared graph.

Shared graph (initialized once):

- Shared low‑pass `BiquadFilterNode` → master `GainNode` → `audioContext.destination`.
- Delay send: per‑voice `GainNode` → shared `DelayNode` → feedback `GainNode` → back to `DelayNode` → wet `GainNode` (mix) → destination.
- Visual tap: per‑voice output also connects to a shared `AnalyserNode`.

Constructed nodes in `useSynthEngine`:

- `AudioContext`, `OscillatorNode` (audio‑rate), `BiquadFilterNode`, `GainNode`, `DelayNode`, `AnalyserNode`, plus an LFO `OscillatorNode` and depth `GainNode` for future routing.

## Voice Behavior

- Frequency: `noteToFrequency` maps C4–B5; base frequency → `osc.frequency.value`.
- Unison: when enabled, creates multiple oscillators per voice; centers detune by index via `osc.detune.value` (cents) and mixes down with a per‑voice mixer (`gain = 1/voices`).
- Glide/portamento: when enabled (optional legato), schedules `osc.frequency.exponentialRampToValueAtTime` from a previous target to the new base frequency over `glide.time`.
- Amp ADSR: schedules on `envelopeGain.gain` using `setValueAtTime` and `linearRampToValueAtTime` for A/D/S; on release, ramps to 0 over `envelope.release`.
- Filter ADSR: schedules on `filterEnvelopeGain.gain`; the control signal connects to the per‑voice filter `frequency` parameter.
- Cleanup: after release, oscillators are stopped at the end of the longest release and all nodes are disconnected.

Polyphony/stealing:

- `performance.maxPolyphony` caps concurrent voices. If `voiceStealing` is enabled and the cap is reached, the engine selects the lowest‑velocity voice to free a slot.

## Controls → Web Audio

- Oscillator
  - `waveform`: sets `osc.type` across active oscillators.
  - `unison.voices`: number of oscillators per voice (2–6 typical).
  - `unison.detune`: detune spread, mapped to `osc.detune.value` (cents).
  - `glide.time/legato`: pitch scheduling on `osc.frequency` using `exponentialRampToValueAtTime`.
  - Note: the UI “Mix” control currently has no corresponding engine mapping.

- Filter (per‑voice and shared)
  - `cutoff`: `BiquadFilterNode.frequency.value`.
  - `resonance` (Q): `BiquadFilterNode.Q.value`.
  - Envelope amount: intended to scale the filter envelope depth, but not yet applied to the modulation path (see Current Gaps).

- Envelopes (amp + filter)
  - Amp ADSR: manipulates `envelopeGain.gain` per voice.
  - Filter ADSR: control signal via `filterEnvelopeGain.gain` → per‑voice filter `frequency`.

- Delay
  - `time`: `DelayNode.delayTime.value` (0–1 s in current UI).
  - `feedback`: feedback `GainNode.gain.value` (safe‑clamped < 1 to avoid runaway).
  - `mix`: wet `GainNode.gain.value` to destination.

- Master
  - `gain`: master `GainNode.gain.value` before destination.

- Visualizers
  - Use `AnalyserNode` with `fftSize = 2048`; scopes render time and frequency data via `getByteTimeDomainData`/`getByteFrequencyData` with frame throttling to ~30 FPS.

## Keyboard & Input

- Computer keys (two octaves):
  - White: `a s d f g h j k l ;` → C4–E5
  - Black: `w e t y u o p` → C#4–D#5
- Octave control:
  - `Z`: Decrease octave (shift keyboard range down)
  - `X`: Increase octave (shift keyboard range up)
- Hook: `useKeyboardControls` de‑bounces repeats, prevents modifiers, and releases stuck notes on `window.blur`.
- Mouse/touch input on the on‑screen keyboard mirrors the same note on/off calls.

## Current Gaps (engine‑level)

- LFO routing: LFO oscillator and depth gain are created and updated but not connected. To enable modulation, connect `lfo → lfoGain → AudioParam` (e.g., `filter.frequency`, `osc.detune`, or a gain for tremolo) and scale depth appropriately per target.
- Filter envelope amount: `filter.envelopeAmount` is exposed in UI but not yet applied. Typical fix: `filterEnvelopeGain → depthGain (gain = amount·range) → filter.frequency`, and consider exponential mapping for musically linear sweeps.
- Shared vs per‑voice filter: existing per‑voice filters keep their initial cutoff/Q; only the shared filter updates live when UI changes. Decide whether the per‑voice filters should be live‑updated.
- Chorus: only a mix gain exists; the actual chorus network (modulated short delays, optional stereo spread) is not implemented.
- Oscillator mix: UI value is not consumed by the engine; define its role (e.g., blend between multiple sources) or remove it.
- Macros: four macro knobs are exposed in UI/state but have no routing yet; decide on destinations (e.g., brightness → filter cutoff, thickness → unison detune/voices, movement → LFO depth/rate, space → delay/chorus mix).

## Implementation Notes

- Scheduling: prefer `exponentialRampToValueAtTime` for pitch changes; linear ramps for gains. Cancel and set a baseline via `cancelScheduledValues` + `setValueAtTime` before ramps to avoid zippering.
- Performance: disconnect voice nodes promptly after release; reuse shared nodes; keep analyser FFT moderate (1024–2048) and throttle canvas updates (already throttled in `ScopesMasterSection`).
- Parameter ranges: current UI ranges are practical defaults (e.g., cutoff 20–20k Hz, Q 0.1–30, delay time 0–1 s, feedback < 0.95). Clamp before writing to `AudioParam`s.

## File Map

- Page: `src/app/synth/page.tsx`
- Shell: `src/components/synth/HybridSynth.tsx`
- Engine: `src/components/synth/hooks/useSynthEngine.ts`
- Keyboard: `src/components/synth/components/Keyboard.tsx`
- Scopes: `src/components/synth/components/Scopes*.tsx`
- UI controls: `src/components/synth/components/*.tsx`
