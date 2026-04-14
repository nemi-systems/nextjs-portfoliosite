'use client'

import React from 'react'
import { LED } from './LED'

interface VoiceToggleProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  voiceNumber: 1 | 2
  color?: 'amber' | 'cyan'
  className?: string
}

export function VoiceToggle({ 
  enabled, 
  onToggle, 
  voiceNumber, 
  color = voiceNumber === 1 ? 'amber' : 'cyan',
  className = ''
}: VoiceToggleProps) {
  const toggleColor = enabled 
    ? color === 'amber' 
      ? 'bg-amber-600 text-white border-amber-500' 
      : 'bg-cyan-600 text-white border-cyan-500'
    : 'bg-gray-700 text-gray-300 border-gray-600'
  
  const buttonClasses = `
    synth-skeu-button 
    text-[8px] 
    ml-1
    w-10
    ${toggleColor}
    ${className}
  `.trim()

  return (
    <div className="subsection-with-led flex items-center gap-1">
      <LED active={enabled} color={color} size="xxs" className="absolute top-1 right-1" />
      <span className="text-[9px] font-mono text-gray-500">V{voiceNumber}</span>
      <button
        onClick={() => onToggle(!enabled)}
        className={buttonClasses}
      >
        {enabled ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}