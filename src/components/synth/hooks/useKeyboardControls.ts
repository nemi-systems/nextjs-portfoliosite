import React, { useState, useEffect } from 'react'

interface KeyboardControlsProps {
  onNoteOn: (note: string) => void
  onNoteOff: (note: string) => void
  currentOctave?: number
  onOctaveUp?: () => void
  onOctaveDown?: () => void
}

// Base key mappings without octave (will be calculated dynamically)
const BASE_KEY_MAPPING: Record<string, string> = {
  // White keys: a s d f g h j k l ; 
  'a': 'C', 's': 'D', 'd': 'E', 'f': 'F', 'g': 'G', 'h': 'A', 'j': 'B',
  'k': 'C', 'l': 'D', ';': 'E',
  
  // Black keys: w e t y u o p
  'w': 'C#', 'e': 'D#', 't': 'F#', 'y': 'G#', 'u': 'A#',
  'o': 'C#', 'p': 'D#'
}

export function useKeyboardControls({ onNoteOn, onNoteOff, currentOctave = 4, onOctaveUp, onOctaveDown }: KeyboardControlsProps) {
  const [activeKeys, setActiveKeys] = useState<Record<string, string>>({})
  const [activeOctaveKeys, setActiveOctaveKeys] = useState<Set<string>>(new Set())

  // Calculate dynamic key mappings based on current octave
  const KEY_MAPPING = React.useMemo(() => {
    const mapping: Record<string, string> = {}
    
    Object.entries(BASE_KEY_MAPPING).forEach(([key, note]) => {
      // Determine octave based on key position
      let octave = currentOctave
      if (key === 'k' || key === 'l' || key === ';' || key === 'o' || key === 'p') {
        octave = currentOctave + 1 // Second octave
      }
      mapping[key] = `${note}${octave}`
    })
    
    return mapping
  }, [currentOctave])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      
      // Skip if key is already active or modifier key
      if (activeKeys[key] || activeOctaveKeys.has(key) || event.ctrlKey || event.altKey || event.metaKey) {
        return
      }

      // Handle octave control keys (Z/X) - FLIPPED
      if (key === 'z' && onOctaveDown) {
        event.preventDefault()
        setActiveOctaveKeys(prev => new Set(prev).add(key))
        onOctaveDown()
        return
      }
      
      if (key === 'x' && onOctaveUp) {
        event.preventDefault()
        setActiveOctaveKeys(prev => new Set(prev).add(key))
        onOctaveUp()
        return
      }

      const note = KEY_MAPPING[key]
      if (note) {
        event.preventDefault()
        setActiveKeys(prev => ({ ...prev, [key]: note }))
        onNoteOn(note)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const note = activeKeys[key]

      // Handle octave control keys (Z/X)
      if ((key === 'z' || key === 'x') && activeOctaveKeys.has(key)) {
        event.preventDefault()
        setActiveOctaveKeys(prev => {
          const newSet = new Set(prev)
          newSet.delete(key)
          return newSet
        })
        return
      }

      if (note) {
        event.preventDefault()
        setActiveKeys(prev => {
          const newKeys = { ...prev }
          delete newKeys[key]
          return newKeys
        })
        onNoteOff(note)
      }
    }

    // Handle window blur to prevent stuck notes
    const handleBlur = () => {
      Object.entries(activeKeys).forEach(([key, note]) => {
        onNoteOff(note)
      })
      setActiveKeys({})
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      
      // Release all active notes on cleanup
      Object.values(activeKeys).forEach(note => {
        onNoteOff(note)
      })
    }
  }, [activeKeys, activeOctaveKeys, onNoteOn, onNoteOff, onOctaveUp, onOctaveDown, KEY_MAPPING])

  return {
    activeKeys,
    KEY_MAPPING
  }
}