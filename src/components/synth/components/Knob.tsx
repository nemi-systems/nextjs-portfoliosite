'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { formatPercentage, formatFrequency, formatInteger, formatDecimal } from '@/lib/synth-utils'

interface KnobProps {
  value: number
  min: number
  max: number
  step?: number
  label: string
  unit?: string
  color?: 'green' | 'amber' | 'red' | 'cyan' | 'magenta' | 'purple'
  onChange: (value: number) => void
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showValue?: boolean
}

export function Knob({
  value,
  min,
  max,
  step = 0.01,
  label,
  unit = '',
  color = 'green',
  onChange,
  size = 'md',
  showValue = true
}: KnobProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const knobRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const startValueRef = useRef(value)

  const svgSizes = {
    xs: { width: 32, height: 32 },
    sm: { width: 48, height: 48 },
    md: { width: 64, height: 64 },
    lg: { width: 80, height: 80 }
  }

  const valueToRotation = (val: number): number => {
    const normalized = (val - min) / (max - min)
    return normalized * 270 - 135 // -135 to +135 degrees
  }

  const rotationToValue = (rotation: number): number => {
    const normalized = (rotation + 135) / 270
    const clamped = Math.max(0, Math.min(1, normalized))
    return min + clamped * (max - min)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    startYRef.current = e.clientY
    startValueRef.current = value
    e.preventDefault()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    startYRef.current = e.touches[0].clientY
    startValueRef.current = value
    e.preventDefault()
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    const deltaY = startYRef.current - e.clientY
    const sensitivity = 0.5
    const valueChange = deltaY * sensitivity * ((max - min) / 100)
    const newValue = Math.max(min, Math.min(max, startValueRef.current + valueChange))
    
    onChange(Math.round(newValue / step) * step)
  }, [isDragging, max, min, onChange, step])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return
    // Prevent the page from scrolling while adjusting the knob
    e.preventDefault()

    const deltaY = startYRef.current - e.touches[0].clientY
    const sensitivity = 0.5
    const valueChange = deltaY * sensitivity * ((max - min) / 100)
    const newValue = Math.max(min, Math.min(max, startValueRef.current + valueChange))
    
    onChange(Math.round(newValue / step) * step)
  }, [isDragging, max, min, onChange, step])

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -step : step
    const newValue = Math.max(min, Math.min(max, value + delta))
    onChange(newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let newValue = value
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        newValue = Math.min(max, value + step)
        break
      case 'ArrowDown':
      case 'ArrowLeft':
        newValue = Math.max(min, value - step)
        break
      case 'Home':
        newValue = max
        break
      case 'End':
        newValue = min
        break
      default:
        return
    }
    e.preventDefault()
    onChange(newValue)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      // Use non-passive listener so preventDefault works on touchmove
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleTouchMove])

  useEffect(() => {
    // Check if knob SVG is available
    const checkSvgLoad = () => {
      const img = new Image()
      img.onload = () => setIsLoaded(true)
      img.onerror = () => {
        // Fallback after timeout
        setTimeout(() => setIsLoaded(true), 1000)
      }
      img.src = '/synth-skins/knob2.svg'
    }
    
    checkSvgLoad()
  }, [])

  const rotation = valueToRotation(value)
  
  // Format display value based on unit and step to avoid IEEE 754 precision issues
  let displayValue: string
  if (unit === '%') {
    displayValue = formatPercentage(value) // Percentages as integers
  } else if (unit === 'Hz') {
    displayValue = formatFrequency(value) // Frequency as integer
  } else if (unit === 'kHz') {
    displayValue = formatDecimal(value, 2) + unit // kHz with 2 decimals
  } else if (step === 1) {
    displayValue = unit ? `${formatInteger(value)}${unit}` : formatInteger(value) // Integers for step=1
  } else {
    displayValue = unit ? `${formatDecimal(value, 2)}${unit}` : formatDecimal(value, 2)
  }
  
  const { width, height } = svgSizes[size]

  return (
    <div className="synth-knob-compact">
      <div className="synth-knob-label">
        {label}
      </div>
      
      {/* Hit area - larger transparent area for better touch interaction */}
      <div
        ref={knobRef}
        className={`
          relative flex items-center justify-center cursor-grab select-none
          transition-all duration-150 hover:shadow-md
          ${isDragging ? 'cursor-grabbing scale-105' : ''}
        `}
        style={{
          width: `${width + 8}px`,
          height: `${height + 8}px`,
          // Prevent browser gestures/scroll during touch interaction
          touchAction: 'none',
          // Avoid scroll chaining to parent while interacting
          overscrollBehavior: 'contain'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        // Also guard at the element level during dragging
        onTouchMove={(e) => { if (isDragging) e.preventDefault() }}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayValue}
      >
        {!isLoaded && (
          // Skeleton ring loading state
          <svg
            width={width}
            height={height}
            viewBox="0 0 100 100"
            className="absolute"
          >
            <circle cx="50" cy="50" r="47" fill="none" stroke="#374151" strokeWidth="3" strokeDasharray="5,5" opacity="0.5"/>
            <circle cx="50" cy="50" r="34" fill="none" stroke="#374151" strokeWidth="2" strokeDasharray="3,3" opacity="0.3"/>
            <line x1="50" y1="16" x2="50" y2="34" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
        
        {/* Main knob SVG */}
        <svg
          width={width}
          height={height}
          viewBox="0 0 100 100"
          style={{ 
            pointerEvents: 'none',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
        >
            {/* Use the knob2.svg as background */}
            <image 
              href="/synth-skins/knob2.svg" 
              width="100" 
              height="100" 
              preserveAspectRatio="xMidYMid meet"
            />
            
            {/* Rotating indicator overlay */}
            <g transform={`rotate(${rotation} 50 50)`}>
              <line
                x1="50"
                y1="1.5"
                x2="50"
                y2="30"
                stroke="#ffbf3a"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <line
                x1="50"
                y1="1.5"
                x2="50"
                y2="30"
                stroke="#ffbf3a"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.22"
              />
            </g>
          </svg>
      </div>

      {/* Value display */}
      {showValue && (
        <div className={`synth-knob-value text-gray-400`}>
          {displayValue}
        </div>
      )}
    </div>
  )
}
