'use client'

import React from 'react'

export interface SynthButtonGroupProps {
  options: { key: string; label: string; icon?: React.ReactNode }[]
  selectedKey: string
  onChange: (key: string) => void
  size?: 'sm' | 'md'
  className?: string
  showIcons?: boolean
}

export function SynthButtonGroup({
  options,
  selectedKey,
  onChange,
  size = 'md',
  className = '',
  showIcons = false
}: SynthButtonGroupProps) {
  const sizeClasses = {
    sm: 'h-8 text-[9px]',
    md: 'h-10 text-[10px]'
  }

  return (
    <div className={`${size === 'sm' ? 'w-32' : 'w-40'} ${className}`}>
      {/* Desktop: horizontal layout */}
      <div className="hidden md:flex">
        {options.map((option, index) => {
          const isSelected = selectedKey === option.key
          const isFirst = index === 0
          const isLast = index === options.length - 1
          
          return (
            <button
              key={option.key}
              className={`
                synth-button-waveform
                flex-1
                ${sizeClasses[size]}
                ${isFirst ? 'rounded-l rounded-r-none' : ''}
                ${isLast ? 'rounded-r rounded-l-none' : 'rounded-none'}
                ${!isFirst && !isLast ? 'border-l-0' : ''}
                ${isSelected ? 'active' : ''}
                ${showIcons ? 'flex flex-col items-center justify-center gap-0.5' : 'flex items-center justify-center'}
              `}
              style={isSelected ? { boxShadow: '0 0 8px rgba(56, 189, 248, 0.5)' } : undefined}
              onClick={() => onChange(option.key)}
              aria-label={`${option.label}${isSelected ? ' (selected)' : ''}`}
              aria-pressed={isSelected}
            >
              {showIcons && option.icon && (
                <div className="w-6 h-3 opacity-60">
                  {option.icon}
                </div>
              )}
              <span className={showIcons ? 'text-[8px]' : ''}>
                {option.label}
              </span>
            </button>
          )
        })}
      </div>
      
      {/* Mobile: fused rectangle layout */}
      <div className="md:hidden synth-button-group-container rounded w-full">
        <div className="grid grid-cols-2 gap-0 w-full">
          {options.map((option, index) => {
            const isSelected = selectedKey === option.key
            const isFirst = index === 0
            const isLast = index === options.length - 1
            const isTopLeft = index === 0
            const isTopRight = index === 1
            const isBottomLeft = index === 2
            const isBottomRight = index === 3
            
            return (
              <button
                key={option.key}
                className={`
                  ${sizeClasses[size]}
                  ${isSelected ? 'synth-button-group-item-active' : 'synth-button-group-item'}
                  ${showIcons ? 'flex flex-col items-center justify-center gap-0.5' : 'flex items-center justify-center'}
                  ${isTopLeft ? 'rounded-tl' : ''}
                  ${isTopRight ? 'rounded-tr' : ''}
                  ${isBottomLeft ? 'rounded-bl' : ''}
                  ${isBottomRight ? 'rounded-br' : ''}
                `}
                onClick={() => onChange(option.key)}
                aria-label={`${option.label}${isSelected ? ' (selected)' : ''}`}
                aria-pressed={isSelected}
              >
                {showIcons && option.icon && (
                  <div className="w-6 h-3 opacity-60">
                    {option.icon}
                  </div>
                )}
                {!showIcons && (
                  <span className={size === 'sm' ? 'text-[8px]' : 'text-[10px]'}>
                    {option.label}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}