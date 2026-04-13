'use client'

import React, { useState, useEffect, useRef } from 'react'
import { LED } from './LED'

interface ScopesProps {
  audioContext: AudioContext | null
  analyser: AnalyserNode | null
}

type ScopeType = 'wave' | 'spectrum'

export function Scopes({ audioContext, analyser }: ScopesProps) {
  const [activeTab, setActiveTab] = useState<ScopeType>('wave')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  
  // Throttle rendering for performance
  const lastRenderRef = useRef<number>(0)
  const FPS = 30
  const FRAME_TIME = 1000 / FPS

  useEffect(() => {
    if (!analyser || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = (timestamp: number) => {
      // Throttle rendering
      if (timestamp - lastRenderRef.current < FRAME_TIME) {
        animationRef.current = requestAnimationFrame(draw)
        return
      }
      lastRenderRef.current = timestamp

      analyser.getByteTimeDomainData(dataArray)

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      if (activeTab === 'wave') {
        // Draw waveform
        ctx.lineWidth = 1
        ctx.strokeStyle = '#22d3ee'
        ctx.beginPath()

        const sliceWidth = canvas.width / bufferLength
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0
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
      } else {
        // Draw spectrum
        analyser.getByteFrequencyData(dataArray)
        
        const barWidth = (canvas.width / bufferLength) * 2.5
        let barHeight
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * canvas.height

          const hue = (i / bufferLength) * 240 // Blue to cyan gradient
          ctx.fillStyle = `hsl(${180 + hue * 0.3}, 70%, 50%)`
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

          x += barWidth + 1
        }
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    animationRef.current = requestAnimationFrame(draw)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [analyser, activeTab, FRAME_TIME])

  const handleCanvasClick = () => {
    setIsModalOpen(true)
  }

  return (
    <>
      <div className="synth-section">
        <div className="synth-section-title">SCOPES</div>
        
        {/* Tabs */}
        <div className="flex gap-1 mb-2">
          <button
            className={`flex-1 synth-button-small text-[9px] ${
              activeTab === 'wave' ? 'bg-cyan-600 text-white border-cyan-500' : ''
            }`}
            onClick={() => setActiveTab('wave')}
          >
            Wave
          </button>
          <button
            className={`flex-1 synth-button-small text-[9px] ${
              activeTab === 'spectrum' ? 'bg-cyan-600 text-white border-cyan-500' : ''
            }`}
            onClick={() => setActiveTab('spectrum')}
          >
            Spec
          </button>
        </div>

        {/* Mini Scope */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={200}
            height={80}
            className="w-full h-16 bg-black border border-gray-700 rounded cursor-pointer hover:border-cyan-500 transition-colors"
            onClick={handleCanvasClick}
          />
          <div className="absolute top-1 right-1">
            <LED active={true} color="cyan" size="xxs" />
          </div>
          <div className="absolute bottom-1 left-1 text-[8px] font-mono text-gray-500">
            {activeTab === 'wave' ? 'TIME' : 'FREQ'}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 mt-2 text-[8px] font-mono">
          <div className="bg-gray-900 rounded px-2 py-1">
            <div className="text-gray-500">PEAK</div>
            <div className="text-cyan-400">-12dB</div>
          </div>
          <div className="bg-gray-900 rounded px-2 py-1">
            <div className="text-gray-500">RMS</div>
            <div className="text-cyan-400">-18dB</div>
          </div>
        </div>
      </div>

      {/* Modal for full scope view */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono text-cyan-400">
                {activeTab === 'wave' ? 'Waveform' : 'Spectrum'} Analyzer
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="synth-button-small"
              >
                Close
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={800}
              height={300}
              className="w-full bg-black border border-gray-700 rounded"
            />
          </div>
        </div>
      )}
    </>
  )
}
