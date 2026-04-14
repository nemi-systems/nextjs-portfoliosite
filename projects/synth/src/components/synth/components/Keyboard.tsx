'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

interface KeyboardProps {
  activeKeys: Record<string, string>
  onNoteOn: (note: string) => void
  onNoteOff: (note: string) => void
  onMouseActiveKeysChange?: (activeKeys: Set<string>) => void
  currentOctave?: number
  onOctaveUp?: () => void
  onOctaveDown?: () => void
}

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const BLACK_KEYS = ['C#', 'D#', 'F#', 'G#', 'A#']

// Define black key positions relative to white keys (0-indexed positions)
const BLACK_KEY_POSITIONS = {
  'C#': 0,    // After C (position 0)
  'D#': 1,    // After D (position 1)  
  'F#': 3,    // After F (position 3)
  'G#': 4,    // After G (position 4)
  'A#': 5     // After A (position 5)
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

export function Keyboard({ activeKeys, onNoteOn, onNoteOff, onMouseActiveKeysChange, currentOctave = 4, onOctaveUp, onOctaveDown }: KeyboardProps) {
  const [mouseActiveKeys, setMouseActiveKeys] = useState<Set<string>>(new Set())
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [isTouchActive, setIsTouchActive] = useState(false)
  const [currentMouseKey, setCurrentMouseKey] = useState<string | null>(null)
  const keyboardRef = useRef<HTMLDivElement>(null)
  
  // Calculate dynamic key mappings based on current octave
  const KEY_MAPPING: Record<string, string> = React.useMemo(() => {
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
  
  const REVERSE_MAPPING: Record<string, string> = React.useMemo(() => {
    return Object.entries(KEY_MAPPING).reduce((acc, [key, note]) => {
      acc[note] = key
      return acc
    }, {} as Record<string, string>)
  }, [KEY_MAPPING])
  
  const octaves = [currentOctave, currentOctave + 1] // Dynamic octaves
  const allNotes: string[] = []

  // Generate notes for all octaves (both white and black keys)
  for (const octave of octaves) {
    // Add white keys
    for (const note of WHITE_KEYS) {
      const noteWithOctave = `${note}${octave}`
      if (REVERSE_MAPPING[noteWithOctave]) {
        allNotes.push(noteWithOctave)
      }
    }
    // Add black keys
    for (const note of BLACK_KEYS) {
      const noteWithOctave = `${note}${octave}`
      if (REVERSE_MAPPING[noteWithOctave]) {
        allNotes.push(noteWithOctave)
      }
    }
  }

  const isKeyActive = (note: string) => {
    return Object.values(activeKeys).includes(note) || mouseActiveKeys.has(note)
  }

  const getKeyLabel = (note: string) => {
    return REVERSE_MAPPING[note] || ''
  }

  const handleMouseUp = (note: string) => {
    if (currentMouseKey === note) {
      setIsMouseDown(false)
      setCurrentMouseKey(null)
    }
    setMouseActiveKeys(prev => {
      const newSet = new Set(prev)
      newSet.delete(note)
      return newSet
    })
    onNoteOff(note)
  }

  const handleTouchEnd = (e: React.TouchEvent, note: string) => {
    e.preventDefault()
    if (currentMouseKey === note) {
      setIsTouchActive(false)
      setCurrentMouseKey(null)
    }
    setMouseActiveKeys(prev => {
      const newSet = new Set(prev)
      newSet.delete(note)
      return newSet
    })
    onNoteOff(note)
  }

  // Find the key at a given position
  const getKeyAtPosition = (x: number, y: number): string | null => {
    if (!keyboardRef.current) return null
    
    const containerRect = keyboardRef.current.getBoundingClientRect()
    const relativeX = x - containerRect.left
    const relativeY = y - containerRect.top
    
    // Check black keys first (they're on top)
    const blackKeyElements = keyboardRef.current.querySelectorAll('.key-black')
    for (const element of blackKeyElements) {
      const rect = element.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const note = element.getAttribute('data-note')
        return note || null
      }
    }
    
    // Check white keys
    const whiteKeyElements = keyboardRef.current.querySelectorAll('.key-white')
    for (const element of whiteKeyElements) {
      const rect = element.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const note = element.getAttribute('data-note')
        return note || null
      }
    }
    
    return null
  }

  // Handle mouse movement while dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !keyboardRef.current) return
    
    const key = getKeyAtPosition(e.clientX, e.clientY)
    if (key && key !== currentMouseKey) {
      // Release previous key
      if (currentMouseKey) {
        setMouseActiveKeys(prev => {
          const newSet = new Set(prev)
          newSet.delete(currentMouseKey)
          return newSet
        })
        onNoteOff(currentMouseKey)
      }
      
      // Activate new key
      setCurrentMouseKey(key)
      setMouseActiveKeys(prev => new Set(prev).add(key))
      onNoteOn(key)
    }
  }

  // Handle touch movement while dragging
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouchActive || !keyboardRef.current) return
    
    e.preventDefault()
    const touch = e.touches[0]
    const key = getKeyAtPosition(touch.clientX, touch.clientY)
    
    if (key && key !== currentMouseKey) {
      // Release previous key
      if (currentMouseKey) {
        setMouseActiveKeys(prev => {
          const newSet = new Set(prev)
          newSet.delete(currentMouseKey)
          return newSet
        })
        onNoteOff(currentMouseKey)
      }
      
      // Activate new key
      setCurrentMouseKey(key)
      setMouseActiveKeys(prev => new Set(prev).add(key))
      onNoteOn(key)
    }
  }

  // Global mouse up handler
  const handleGlobalMouseUp = useCallback(() => {
    if (isMouseDown && currentMouseKey) {
      setMouseActiveKeys(prev => {
        const newSet = new Set(prev)
        newSet.delete(currentMouseKey)
        return newSet
      })
      onNoteOff(currentMouseKey)
    }
    setIsMouseDown(false)
    setCurrentMouseKey(null)
  }, [isMouseDown, currentMouseKey, onNoteOff])

  // Global touch end handler
  const handleGlobalTouchEnd = useCallback(() => {
    if (isTouchActive && currentMouseKey) {
      setMouseActiveKeys(prev => {
        const newSet = new Set(prev)
        newSet.delete(currentMouseKey)
        return newSet
      })
      onNoteOff(currentMouseKey)
    }
    setIsTouchActive(false)
    setCurrentMouseKey(null)
  }, [isTouchActive, currentMouseKey, onNoteOff])

  // Notify parent of mouseActiveKeys changes
  useEffect(() => {
    if (onMouseActiveKeysChange) {
      onMouseActiveKeysChange(mouseActiveKeys)
    }
  }, [mouseActiveKeys, onMouseActiveKeysChange])

  // Add global event listeners
  useEffect(() => {
    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('touchend', handleGlobalTouchEnd)
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('touchend', handleGlobalTouchEnd)
    }
  }, [isMouseDown, isTouchActive, currentMouseKey, handleGlobalMouseUp, handleGlobalTouchEnd])

  // Hardware-inspired keyboard layout
  // Get the actual white keys that will be rendered (filtered by key mapping)
  const renderedWhiteKeys = allNotes.filter(note => !BLACK_KEYS.some(bk => note.includes(bk)))
  
  // Create a stable mapping for black key positions to prevent flickering
  const stableBlackKeyPositions = React.useMemo(() => {
    const positions: Record<string, number> = {}
    const octaves = [currentOctave, currentOctave + 1]

    for (const octave of octaves) {
      for (const blackKey of BLACK_KEYS) {
        const note = `${blackKey}${octave}`
        // Only calculate position if this black key is actually mapped (exists in REVERSE_MAPPING)
        if (!REVERSE_MAPPING[note]) continue

        const blackKeyPosition = BLACK_KEY_POSITIONS[blackKey as keyof typeof BLACK_KEY_POSITIONS]
        if (typeof blackKeyPosition === 'number') {
          const octaveStartIndex = (octave - currentOctave) * WHITE_KEYS.length
          const whiteKeyIndex = octaveStartIndex + blackKeyPosition
          // Position black key properly between white keys
          positions[note] = ((whiteKeyIndex + 1) / renderedWhiteKeys.length) * 100
        }
      }
    }
    return positions
  }, [currentOctave, renderedWhiteKeys.length, REVERSE_MAPPING])
  
  // Update mouse down handler to enable continuous movement
  const handleMouseDown = (note: string) => {
    setIsMouseDown(true)
    setCurrentMouseKey(note)
    setMouseActiveKeys(prev => new Set(prev).add(note))
    onNoteOn(note)
  }

  // Update touch start handler to enable continuous movement
  const handleTouchStart = (e: React.TouchEvent, note: string) => {
    e.preventDefault()
    setIsTouchActive(true)
    setCurrentMouseKey(note)
    setMouseActiveKeys(prev => new Set(prev).add(note))
    onNoteOn(note)
  }

  return (
    <div 
      ref={keyboardRef}
      className="relative h-24 flex"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseLeave={() => {
        if (isMouseDown && currentMouseKey) {
          setMouseActiveKeys(prev => {
            const newSet = new Set(prev)
            newSet.delete(currentMouseKey)
            return newSet
          })
          onNoteOff(currentMouseKey)
          setCurrentMouseKey(null)
        }
      }}
    >
      {/* Octave Buttons */}
      <div className="flex flex-col gap-2 h-full justify-center items-center pr-2">
        {/* Up Button */}
        <button
          className="octave-button octave-button-up relative group w-8 h-8 flex items-center justify-center"
          aria-label="Octave up (Z key)"
          onClick={onOctaveUp}
        >
          <div className="led-glow" />
          <span className="relative z-10 text-white font-bold text-sm leading-none">▲</span>
        </button>

        {/* Down Button */}
        <button
          className="octave-button octave-button-down relative group w-8 h-8 flex items-center justify-center"
          aria-label="Octave down (X key)"
          onClick={onOctaveDown}
        >
          <div className="led-glow" />
          <span className="relative z-10 text-white font-bold text-sm leading-none">▼</span>
        </button>

        {/* Current Octave Display */}
        <div className="text-[9px] font-mono text-gray-500 font-bold uppercase tracking-wider whitespace-nowrap">
          OCT {currentOctave}
        </div>
      </div>

      {/* Keyboard Keys */}
      <div className="flex-1 relative">
        {/* White keys using CSS Grid for consistent sizing */}
        <div className="grid h-full relative" style={{ gridTemplateColumns: `repeat(${renderedWhiteKeys.length}, 1fr)` }}>
          {octaves.flatMap((octave, octaveIndex) => {
            return WHITE_KEYS.map((whiteKey) => {
              const note = `${whiteKey}${octave}`
              // Only render if this key is in the mapping
              if (!REVERSE_MAPPING[note]) return null

              const keyLabel = getKeyLabel(note)
              const isActive = isKeyActive(note)

              // Use stable key that doesn't change when octave changes
              const stableKey = `${whiteKey}-${octaveIndex}`

              return (
                <div
                  key={stableKey}
                  className={`
                    key-white relative border-r border-gray-600 last:border-r-0
                    ${isActive ? 'bg-cyan-300' : 'bg-white hover:bg-gray-100'}
                    transition-colors duration-100 cursor-pointer select-none
                    flex flex-col justify-between items-center py-1
                  `}
                  data-active={isActive}
                  data-note={note}
                  onMouseDown={() => handleMouseDown(note)}
                  onMouseUp={() => handleMouseUp(note)}
                  onMouseLeave={() => {
                    if (isActive) handleMouseUp(note)
                  }}
                  onTouchStart={(e) => handleTouchStart(e, note)}
                  onTouchEnd={(e) => handleTouchEnd(e, note)}
                >
                  <div className="hidden md:block text-xs font-mono text-gray-500 font-medium">{note}</div>
                  <div className="hidden md:block text-xs font-mono text-gray-700 font-medium">{keyLabel.toUpperCase()}</div>
                  <div className="md:hidden text-xs font-mono text-gray-500 font-medium mt-auto">{note}</div>
                </div>
              )
            })
          }).filter(Boolean)}

          {/* Black keys overlay */}
          <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none">
            {octaves.flatMap((octave, octaveIndex) => {
              return BLACK_KEYS.map((blackKey) => {
                const note = `${blackKey}${octave}`
                // Only render if this key has a mapping (is playable)
                if (!REVERSE_MAPPING[note]) return null

                const keyLabel = getKeyLabel(note)
                const isActive = isKeyActive(note)

                // Use the stable position mapping to prevent flickering
                const position = stableBlackKeyPositions[note]
                if (typeof position !== 'number') {
                  return null
                }

                // Use stable key that doesn't change when octave changes
                // The black key positions stay the same, only their note labels change
                const stableKey = `${blackKey}-${octaveIndex}`

                return (
                  <div
                    key={stableKey}
                    className={`
                      key-black absolute w-7 h-16 rounded-b-sm
                      ${isActive ? 'bg-cyan-600' : 'bg-gray-900 hover:bg-gray-800'}
                      transition-colors duration-100 cursor-pointer select-none
                      pointer-events-auto flex flex-col justify-between items-center py-1 flex-col-reverse
                      z-20
                    `}
                    style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                    data-active={isActive}
                    data-note={note}
                    onMouseDown={() => handleMouseDown(note)}
                    onMouseUp={() => handleMouseUp(note)}
                    onMouseLeave={() => {
                      if (isActive) handleMouseUp(note)
                    }}
                    onTouchStart={(e) => handleTouchStart(e, note)}
                    onTouchEnd={(e) => handleTouchEnd(e, note)}
                  >
                    <div className="text-xs font-mono text-white font-medium hidden md:block">{keyLabel.toUpperCase()}</div>
                  </div>
                )
              })
            }).filter(Boolean)}
          </div>
        </div>
      </div>
    </div>
  )
}
