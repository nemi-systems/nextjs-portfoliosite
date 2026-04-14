'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Knob } from './Knob'
import { LED } from './LED'
import { formatLevel } from '@/lib/synth-utils'

interface ScopesMasterSectionProps {
  audioContext: AudioContext | null
  analyser: AnalyserNode | null
  gain: number
  delayTime: number
  delayFeedback: number
  delayMix: number
  onGainChange: (gain: number) => void
  onDelayTimeChange: (time: number) => void
  onDelayFeedbackChange: (feedback: number) => void
  onDelayMixChange: (mix: number) => void
}

export function ScopesMasterSection({
  audioContext,
  analyser,
  gain,
  delayTime,
  delayFeedback,
  delayMix,
  onGainChange,
  onDelayTimeChange,
  onDelayFeedbackChange,
  onDelayMixChange
}: ScopesMasterSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const waveCanvasRef = useRef<HTMLCanvasElement>(null)
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null)
  const modalWaveCanvasRef = useRef<HTMLCanvasElement>(null)
  const modalSpectrumCanvasRef = useRef<HTMLCanvasElement>(null)
  const waveAnimationRef = useRef<number | null>(null)
  const spectrumAnimationRef = useRef<number | null>(null)
  const modalWaveAnimationRef = useRef<number | null>(null)
  const modalSpectrumAnimationRef = useRef<number | null>(null)
  
  // Throttle rendering for performance
  const lastWaveRenderRef = useRef<number>(0)
  const lastSpectrumRenderRef = useRef<number>(0)
  const lastModalWaveRenderRef = useRef<number>(0)
  const lastModalSpectrumRenderRef = useRef<number>(0)
  const FPS = 30
  const FRAME_TIME = 1000 / FPS

  useEffect(() => {
    if (!analyser) return

    const bufferLength = analyser.frequencyBinCount
    const waveDataArray = new Uint8Array(bufferLength)
    const spectrumDataArray = new Uint8Array(bufferLength)

    // Helper function to draw waveform on any canvas
    const drawWaveform = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      analyser.getByteTimeDomainData(waveDataArray)

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw waveform
      ctx.lineWidth = 1
      ctx.strokeStyle = '#22d3ee'
      ctx.beginPath()

      const sliceWidth = canvas.width / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = waveDataArray[i] / 128.0
        const y = v * canvas.height / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }

        x += sliceWidth
      }

      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }

    // Helper function to draw spectrum on any canvas
    const drawSpectrum = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      analyser.getByteFrequencyData(spectrumDataArray)

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      const barWidth = (canvas.width / bufferLength) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (spectrumDataArray[i] / 255) * canvas.height

        const hue = (i / bufferLength) * 240 // Blue to cyan gradient
        ctx.fillStyle = `hsl(${180 + hue * 0.3}, 70%, 50%)`
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }
    }

    // Small canvas animations
    const drawSmallWave = (timestamp: number) => {
      if (!waveCanvasRef.current) return
      
      // Throttle rendering
      if (timestamp - lastWaveRenderRef.current < FRAME_TIME) {
        waveAnimationRef.current = requestAnimationFrame(drawSmallWave)
        return
      }
      lastWaveRenderRef.current = timestamp

      const ctx = waveCanvasRef.current.getContext('2d')
      if (ctx) drawWaveform(waveCanvasRef.current, ctx)

      waveAnimationRef.current = requestAnimationFrame(drawSmallWave)
    }

    const drawSmallSpectrum = (timestamp: number) => {
      if (!spectrumCanvasRef.current) return
      
      // Throttle rendering
      if (timestamp - lastSpectrumRenderRef.current < FRAME_TIME) {
        spectrumAnimationRef.current = requestAnimationFrame(drawSmallSpectrum)
        return
      }
      lastSpectrumRenderRef.current = timestamp

      const ctx = spectrumCanvasRef.current.getContext('2d')
      if (ctx) drawSpectrum(spectrumCanvasRef.current, ctx)

      spectrumAnimationRef.current = requestAnimationFrame(drawSmallSpectrum)
    }

    // Modal canvas animations
    const drawModalWave = (timestamp: number) => {
      if (!modalWaveCanvasRef.current) return
      
      // Throttle rendering
      if (timestamp - lastModalWaveRenderRef.current < FRAME_TIME) {
        modalWaveAnimationRef.current = requestAnimationFrame(drawModalWave)
        return
      }
      lastModalWaveRenderRef.current = timestamp

      const ctx = modalWaveCanvasRef.current.getContext('2d')
      if (ctx) drawWaveform(modalWaveCanvasRef.current, ctx)

      modalWaveAnimationRef.current = requestAnimationFrame(drawModalWave)
    }

    const drawModalSpectrum = (timestamp: number) => {
      if (!modalSpectrumCanvasRef.current) return
      
      // Throttle rendering
      if (timestamp - lastModalSpectrumRenderRef.current < FRAME_TIME) {
        modalSpectrumAnimationRef.current = requestAnimationFrame(drawModalSpectrum)
        return
      }
      lastModalSpectrumRenderRef.current = timestamp

      const ctx = modalSpectrumCanvasRef.current.getContext('2d')
      if (ctx) drawSpectrum(modalSpectrumCanvasRef.current, ctx)

      modalSpectrumAnimationRef.current = requestAnimationFrame(drawModalSpectrum)
    }

    // Start animations for available canvases
    if (waveCanvasRef.current) {
      waveAnimationRef.current = requestAnimationFrame(drawSmallWave)
    }
    if (spectrumCanvasRef.current) {
      spectrumAnimationRef.current = requestAnimationFrame(drawSmallSpectrum)
    }
    if (modalWaveCanvasRef.current) {
      modalWaveAnimationRef.current = requestAnimationFrame(drawModalWave)
    }
    if (modalSpectrumCanvasRef.current) {
      modalSpectrumAnimationRef.current = requestAnimationFrame(drawModalSpectrum)
    }

    return () => {
      if (waveAnimationRef.current !== null) {
        cancelAnimationFrame(waveAnimationRef.current)
      }
      if (spectrumAnimationRef.current !== null) {
        cancelAnimationFrame(spectrumAnimationRef.current)
      }
      if (modalWaveAnimationRef.current !== null) {
        cancelAnimationFrame(modalWaveAnimationRef.current)
      }
      if (modalSpectrumAnimationRef.current !== null) {
        cancelAnimationFrame(modalSpectrumAnimationRef.current)
      }
    }
  }, [analyser, isModalOpen, FRAME_TIME]) // Add isModalOpen to re-run when modal opens/closes

  const handleCanvasClick = () => {
    setIsModalOpen(true)
  }

  return (
    <>
      <div className="synth-section">
        <div className="synth-section-title text-left">SCOPES/MASTER</div>
        
        {/* Scopes Section */}
        <div className="mb-3">
          {/* Dual Scopes */}
          <div className="grid grid-cols-2 gap-2">
            {/* Waveform Scope */}
            <div className="relative bezel">
              <canvas
                ref={waveCanvasRef}
                width={120}
                height={80}
                className="w-full h-16 bg-black border border-gray-700 rounded cursor-pointer hover:border-cyan-500 transition-colors"
                onClick={handleCanvasClick}
              />
              <div className="absolute top-1 right-1">
                <LED active={true} color="cyan" size="xxs" />
              </div>
              <div className="absolute bottom-1 left-1 text-[8px] font-mono text-gray-500">
                TIME
              </div>
            </div>
            
            {/* Spectrum Scope */}
            <div className="relative bezel">
              <canvas
                ref={spectrumCanvasRef}
                width={120}
                height={80}
                className="w-full h-16 bg-black border border-gray-700 rounded cursor-pointer hover:border-cyan-500 transition-colors"
                onClick={handleCanvasClick}
              />
              <div className="absolute top-1 right-1">
                <LED active={true} color="cyan" size="xxs" />
              </div>
              <div className="absolute bottom-1 left-1 text-[8px] font-mono text-gray-500">
                FREQ
              </div>
            </div>
          </div>
        </div>

        {/* Master Section */}
        <div className="border-t border-gray-600 pt-3 flex flex-col flex-1">
          {/* Master Controls Grid */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            {/* Volume Control */}
            <div className="synth-knob-compact">
              <Knob
                value={gain}
                min={0}
                max={1}
                step={0.01}
                label="VOL"
                unit="%"
                color="green"
                onChange={onGainChange}
                size="xs"
              />
            </div>
            
            {/* Delay Time */}
            <div className="synth-knob-compact">
              <Knob
                value={delayTime}
                min={0}
                max={1}
                step={0.01}
                label="TIME"
                unit="s"
                color="amber"
                onChange={onDelayTimeChange}
                size="xs"
              />
            </div>
            
            {/* Delay Feedback */}
            <div className="synth-knob-compact">
              <Knob
                value={delayFeedback}
                min={0}
                max={0.95}
                step={0.01}
                label="FB"
                unit="%"
                color="red"
                onChange={onDelayFeedbackChange}
                size="xs"
              />
            </div>

            {/* Delay Mix */}
            <div className="synth-knob-compact">
              <Knob
                value={delayMix}
                min={0}
                max={1}
                step={0.01}
                label="MIX"
                unit="%"
                color="magenta"
                onChange={onDelayMixChange}
                size="xs"
              />
            </div>
          </div>

          {/* Compact Level Meters */}
          <div className="grid grid-cols-2 gap-1">
            {/* Input Level */}
            <div className="screen">
              <div className="synth-text-xs synth-mb-1 synth-var-ink-1">IN</div>
              <div className="h-4 bg-gray-900 rounded relative overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-100"
                  style={{ width: formatLevel(gain) }}
                />
              </div>
            </div>
            
            {/* Delay Level */}
            <div className="screen">
              <div className="synth-text-xs synth-mb-1 synth-var-ink-1">DLY</div>
              <div className="h-4 bg-gray-900 rounded relative overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-600 to-red-500 transition-all duration-100"
                  style={{ width: formatLevel(delayTime > 0 ? delayMix : 0) }}
                />
              </div>
            </div>
          </div>

          {/* Korgi Logo */}
          <div className="flex justify-end mt-auto mb-1">
            <Image 
              src="/assets/korgi-original.webp"
              alt="Korgi Logo"
              width={120}
              height={40}
              className="w-[80%] md:w-auto h-auto max-h-16 md:max-h-10 lg:max-h-12 object-contain"
            />
          </div>
        </div>
      </div>

      {/* Modal for full scope view */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="panel p-4 max-w-4xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono text-cyan-400">
                Dual Analyzer
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="synth-button-small"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-mono text-gray-400 mb-2">Waveform</div>
                <canvas
                  ref={modalWaveCanvasRef}
                  width={400}
                  height={300}
                  className="w-full"
                />
              </div>
              <div>
                <div className="text-sm font-mono text-gray-400 mb-2">Spectrum</div>
                <canvas
                  ref={modalSpectrumCanvasRef}
                  width={400}
                  height={300}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
