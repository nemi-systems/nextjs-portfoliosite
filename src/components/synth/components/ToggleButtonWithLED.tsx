'use client'

import React from 'react'
import { LED } from './LED'

interface ToggleButtonWithLEDProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  label: string
  color: 'amber' | 'cyan' | 'green' | 'purple' | 'magenta'
  className?: string
}

export function ToggleButtonWithLED({ 
  enabled, 
  onToggle, 
  label, 
  color,
  className = ''
}: ToggleButtonWithLEDProps) {
  const toggleColor = enabled 
    ? color === 'amber' 
      ? 'bg-amber-600 text-white border-amber-500'
      : color === 'cyan'
      ? 'bg-cyan-600 text-white border-cyan-500'
      : color === 'green'
      ? 'bg-green-600 text-white border-green-500'
      : color === 'purple'
      ? 'bg-purple-600 text-white border-purple-500'
      : 'bg-magenta-600 text-white border-magenta-500'
    : 'bg-gray-700 text-gray-300 border-gray-600'
  
  const buttonClasses = `
    synth-skeu-button 
    text-[8px] 
    w-10
    relative
    ${toggleColor}
    ${className}
  `.trim()

  return (
    <button
      onClick={() => onToggle(!enabled)}
      className={buttonClasses}
    >
      <LED active={enabled} color={color} size="xxs" className="absolute top-0.5 right-0.5" />
      {enabled ? 'ON' : 'OFF'}
    </button>
  )
}