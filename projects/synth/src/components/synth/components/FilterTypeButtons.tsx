"use client"

import React from 'react'
import { SynthButtonGroup } from './SynthButtonGroup'

export type FilterTypeOption = 'lowpass' | 'highpass' | 'bandpass' | 'notch'

interface Props {
  selectedType: FilterTypeOption
  onChange: (type: FilterTypeOption) => void
  size?: 'sm' | 'md'
  className?: string
}

const TYPES: { key: FilterTypeOption; label: string }[] = [
  { key: 'lowpass', label: 'LP' },
  { key: 'highpass', label: 'HP' },
  { key: 'bandpass', label: 'BP' },
  { key: 'notch', label: 'NOTCH' }
]

export function FilterTypeButtons({ selectedType, onChange, size = 'md', className = '' }: Props) {
  return (
    <SynthButtonGroup
      options={TYPES}
      selectedKey={selectedType}
      onChange={onChange as (key: string) => void}
      size={size}
      className={`${size === 'sm' ? 'w-28' : 'w-32'} ${className}`}
    />
  )
}

