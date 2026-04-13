// @ts-nocheck
'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  type SpeedLevel,
  bandLevelToAngularVelocity,
  renderRetroGlobeFrame,
  speedLevelToAngularVelocity,
  wobbleLevelToAngularVelocity
} from '@/lib/retroGlobeCanvas'

type RotationAxis = 'x' | 'y' | 'z'

type RenderSize = {
  width: number
  height: number
  dpr: number
}

const SPEED_LEVELS: SpeedLevel[] = [0, 1, 2, 4, 5]
const TAU = Math.PI * 2

const normalizeRadians = (value: number) => {
  const normalized = value % TAU
  return normalized < 0 ? normalized + TAU : normalized
}

export const RetroGlobe = () => {
  const [mounted, setMounted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [lineWidth, setLineWidth] = useState(3)
  const [lineDensity, setLineDensity] = useState(1)
  const [rotationSpeed, setRotationSpeed] = useState<SpeedLevel>(1)
  const [wobbleSpeed, setWobbleSpeed] = useState(1)
  const [bandSpeed, setBandSpeed] = useState(2)
  const [xRotationSpeed, setXRotationSpeed] = useState<SpeedLevel>(0)
  const [zRotationSpeed, setZRotationSpeed] = useState<SpeedLevel>(0)
  const [flashingButton, setFlashingButton] = useState<string | null>(null)
  const [userRotationX, setUserRotationX] = useState(0)
  const [userRotationY, setUserRotationY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  const globeWrapperRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

  const runtimeRef = useRef({
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    wobble: 0,
    bandPhase: 0,
    paused: false
  })

  const renderSizeRef = useRef<RenderSize>({
    width: 280,
    height: 280,
    dpr: 1
  })

  const controlsRef = useRef({
    lineWidth: 3,
    lineDensity: 1,
    xSpeed: 0 as SpeedLevel,
    ySpeed: 1 as SpeedLevel,
    zSpeed: 0 as SpeedLevel,
    wobbleSpeed: 1,
    bandSpeed: 2,
    isFlashing: false
  })

  const userRotationRef = useRef({ x: 0, y: 0 })
  const pausedRef = useRef(false)
  const draggingRef = useRef(false)
  const frameRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number | null>(null)

  const isGlobeFlashing = useMemo(() => {
    return xRotationSpeed === 5 && rotationSpeed === 5 && zRotationSpeed === 5
  }, [xRotationSpeed, rotationSpeed, zRotationSpeed])

  const flashButton = useCallback((buttonId: string) => {
    setFlashingButton(buttonId)
    setTimeout(() => setFlashingButton(null), 200)
  }, [])

  const incrementLineWidth = useCallback(() => {
    if (lineWidth >= 9) {
      flashButton('line-plus')
      return
    }
    setLineWidth((prev) => Math.min(9, prev + 1))
  }, [lineWidth, flashButton])

  const decrementLineWidth = useCallback(() => {
    if (lineWidth <= 0) {
      flashButton('line-minus')
      return
    }
    setLineWidth((prev) => Math.max(0, prev - 1))
  }, [lineWidth, flashButton])

  const incrementLineDensity = useCallback(() => {
    if (lineDensity >= 5) {
      flashButton('density-plus')
      return
    }
    setLineDensity((prev) => Math.min(5, prev + 1))
  }, [lineDensity, flashButton])

  const decrementLineDensity = useCallback(() => {
    if (lineDensity <= 0) {
      flashButton('density-minus')
      return
    }
    setLineDensity((prev) => Math.max(0, prev - 1))
  }, [lineDensity, flashButton])

  const setSpeedLevel = useCallback((axis: RotationAxis, level: SpeedLevel) => {
    switch (axis) {
      case 'x':
        setXRotationSpeed(level)
        break
      case 'y':
        setRotationSpeed(level)
        break
      case 'z':
        setZRotationSpeed(level)
        break
    }
  }, [])

  const spinMatrixRows = useMemo(() => {
    return [
      { key: 'x' as const, value: xRotationSpeed },
      { key: 'y' as const, value: rotationSpeed },
      { key: 'z' as const, value: zRotationSpeed }
    ]
  }, [xRotationSpeed, rotationSpeed, zRotationSpeed])

  const handleWobbleSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number.parseFloat(event.target.value)
    if (Number.isNaN(nextValue)) {
      return
    }

    setWobbleSpeed(Math.max(0, Math.min(5, nextValue)))
  }, [])

  const handleBandSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number.parseFloat(event.target.value)
    if (Number.isNaN(nextValue)) {
      return
    }

    setBandSpeed(Math.max(0, Math.min(5, nextValue)))
  }, [])

  const handlePointerStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true)
    setLastMousePos({ x: clientX, y: clientY })
  }, [])

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!draggingRef.current) {
      return
    }

    const deltaX = clientX - lastMousePos.x
    const deltaY = clientY - lastMousePos.y
    const sensitivity = 0.5

    setUserRotationY((prev) => prev + deltaX * sensitivity)
    setUserRotationX((prev) => prev + deltaY * sensitivity)
    setLastMousePos({ x: clientX, y: clientY })
  }, [lastMousePos])

  const handlePointerEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handlePointerStart(e.clientX, e.clientY)
  }, [handlePointerStart])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handlePointerMove(e.clientX, e.clientY)
  }, [handlePointerMove])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    handlePointerStart(touch.clientX, touch.clientY)
  }, [handlePointerStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    handlePointerMove(touch.clientX, touch.clientY)
  }, [handlePointerMove])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    controlsRef.current = {
      lineWidth,
      lineDensity,
      xSpeed: xRotationSpeed,
      ySpeed: rotationSpeed,
      zSpeed: zRotationSpeed,
      wobbleSpeed,
      bandSpeed,
      isFlashing: isGlobeFlashing
    }
  }, [lineWidth, lineDensity, xRotationSpeed, rotationSpeed, zRotationSpeed, wobbleSpeed, bandSpeed, isGlobeFlashing])

  useEffect(() => {
    userRotationRef.current = {
      x: userRotationX,
      y: userRotationY
    }
  }, [userRotationX, userRotationY])

  useEffect(() => {
    pausedRef.current = isPaused
    runtimeRef.current.paused = isPaused
  }, [isPaused])

  useEffect(() => {
    draggingRef.current = isDragging
  }, [isDragging])

  useEffect(() => {
    if (!mounted) {
      return
    }

    const canvas = canvasRef.current
    const wrapper = globeWrapperRef.current

    if (!canvas || !wrapper) {
      return
    }

    const updateSize = () => {
      const rect = wrapper.getBoundingClientRect()
      const width = Math.max(1, Math.round(rect.width))
      const height = Math.max(1, Math.round(rect.height))
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      const nextCanvasWidth = Math.round(width * dpr)
      const nextCanvasHeight = Math.round(height * dpr)

      if (canvas.width !== nextCanvasWidth || canvas.height !== nextCanvasHeight) {
        canvas.width = nextCanvasWidth
        canvas.height = nextCanvasHeight
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
      }

      renderSizeRef.current = { width, height, dpr }
      contextRef.current = canvas.getContext('2d', { alpha: true })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(wrapper)
    window.addEventListener('resize', updateSize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted) {
      return
    }

    const animate = (timestamp: number) => {
      const prevTimestamp = lastTimestampRef.current ?? timestamp
      const deltaSeconds = Math.min((timestamp - prevTimestamp) / 1000, 0.05)

      lastTimestampRef.current = timestamp

      const runtime = runtimeRef.current
      const controls = controlsRef.current

      if (!pausedRef.current) {
        if (!draggingRef.current) {
          runtime.rotX = normalizeRadians(runtime.rotX + speedLevelToAngularVelocity(controls.xSpeed) * deltaSeconds)
          runtime.rotY = normalizeRadians(runtime.rotY + speedLevelToAngularVelocity(controls.ySpeed) * deltaSeconds)
          runtime.rotZ = normalizeRadians(runtime.rotZ + speedLevelToAngularVelocity(controls.zSpeed) * deltaSeconds)
          runtime.wobble = normalizeRadians(runtime.wobble + wobbleLevelToAngularVelocity(controls.wobbleSpeed) * deltaSeconds)
        }

        runtime.bandPhase = normalizeRadians(
          runtime.bandPhase + bandLevelToAngularVelocity(controls.bandSpeed) * deltaSeconds
        )
      }

      const ctx = contextRef.current
      const { width, height, dpr } = renderSizeRef.current

      if (ctx) {
        renderRetroGlobeFrame(ctx, {
          width,
          height,
          dpr,
          runtime,
          controls,
          userRotationXDeg: userRotationRef.current.x,
          userRotationYDeg: userRotationRef.current.y
        })
      }

      frameRef.current = window.requestAnimationFrame(animate)
    }

    frameRef.current = window.requestAnimationFrame(animate)

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      lastTimestampRef.current = null
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted) {
      return
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggingRef.current) {
        handlePointerMove(e.clientX, e.clientY)
      }
    }

    const handleGlobalMouseUp = () => {
      if (draggingRef.current) {
        handlePointerEnd()
      }
    }

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (draggingRef.current && e.touches.length > 0) {
        e.preventDefault()
        const touch = e.touches[0]
        handlePointerMove(touch.clientX, touch.clientY)
      }
    }

    const handleGlobalTouchEnd = () => {
      if (draggingRef.current) {
        handlePointerEnd()
      }
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false })
    document.addEventListener('touchend', handleGlobalTouchEnd)
    document.addEventListener('touchcancel', handleGlobalTouchEnd)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('touchmove', handleGlobalTouchMove)
      document.removeEventListener('touchend', handleGlobalTouchEnd)
      document.removeEventListener('touchcancel', handleGlobalTouchEnd)
    }
  }, [mounted, handlePointerMove, handlePointerEnd])

  if (!mounted) {
    return (
      <div className="retro-globe-container">
        <div className="globe-wrapper">
          <div className="globe-canvas-stage">
            <canvas className="globe-canvas" aria-hidden="true" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="retro-globe-container bg-bg-main">
      <div
        className="globe-wrapper rounded-full"
        ref={globeWrapperRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className={`globe-canvas-stage ${isPaused ? 'paused' : ''} ${isDragging ? 'dragging' : ''}`}>
          <canvas
            ref={canvasRef}
            className={`globe-canvas ${isGlobeFlashing ? 'globe-canvas-flashing' : ''}`}
            aria-label="Retro globe"
            role="img"
          />
        </div>
      </div>

      <div className="globe-control-bar">
        <div className="control-bar-grid">
          <div className="boombox-controls play-pause play-pause-wide">
            <button
              className={`boombox-button ${!isPaused ? 'active' : 'inactive'}`}
              onClick={() => setIsPaused(false)}
            >
              ▶
            </button>
            <button
              className={`boombox-button ${isPaused ? 'active' : 'inactive'}`}
              onClick={() => setIsPaused(true)}
            >
              ■
            </button>
          </div>

          <div className="boombox-controls labeled">
            <span className="control-label">
              SCAN
              <span className="value-box">
                <span className={lineWidth > 0 ? 'glowing-digit' : ''}>{lineWidth}</span>
              </span>
            </span>
            <div className="control-buttons-row">
              <button
                className={`boombox-button ${flashingButton === 'line-minus' ? 'flashing-red' : ''}`}
                onClick={decrementLineWidth}
              >
                -
              </button>
              <button
                className={`boombox-button ${flashingButton === 'line-plus' ? 'flashing-red' : ''}`}
                onClick={incrementLineWidth}
              >
                +
              </button>
            </div>
          </div>

          <div className="boombox-controls labeled">
            <span className="control-label">
              DENS
              <span className="value-box">
                <span className={lineDensity > 0 ? 'glowing-digit' : ''}>{lineDensity}</span>
              </span>
            </span>
            <div className="control-buttons-row">
              <button
                className={`boombox-button ${flashingButton === 'density-minus' ? 'flashing-red' : ''}`}
                onClick={decrementLineDensity}
              >
                -
              </button>
              <button
                className={`boombox-button ${flashingButton === 'density-plus' ? 'flashing-red' : ''}`}
                onClick={incrementLineDensity}
              >
                +
              </button>
            </div>
          </div>

          <div className="boombox-controls equalizer-controls matrix-controls spin-matrix-controls">
            <div className="matrix-segmented-label">
              <div className="matrix-segment spin-segment">
                <span className="matrix-vertical-text">spin</span>
              </div>
            </div>
            <div className="equalizer-container">
              {spinMatrixRows.map((row) => {
                const currentSpeed = row.value

                return (
                  <div key={row.key} className="equalizer-row">
                    <div className="equalizer-levels">
                      {SPEED_LEVELS.map((level) => {
                        const isActive = level === currentSpeed
                        const isLitUp = level <= currentSpeed && currentSpeed > 0
                        const isMaxAndActive = level === 5 && isActive
                        const shouldPulseRed = isMaxAndActive && isGlobeFlashing
                        const isActiveNotMax = isActive && level < 5

                        return (
                          <button
                            key={level}
                            className={`equalizer-level ${isActiveNotMax ? 'active' : ''} ${shouldPulseRed ? 'active-red-pulsing' : isMaxAndActive ? 'active-red' : ''} ${isLitUp && !isActive ? 'lit-up' : ''}`}
                            onClick={() => setSpeedLevel(row.key, level)}
                            data-level={level}
                          >
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="boombox-controls slider-controls">
            <div className="slider-track-shell">
              <input
                type="range"
                className="industrial-vertical-slider"
                min={0}
                max={5}
                step={0.01}
                value={wobbleSpeed}
                onChange={handleWobbleSliderChange}
                aria-label="osc speed"
              />
            </div>
            <span className="slider-bottom-label">osc</span>
          </div>

          <div className="boombox-controls slider-controls">
            <div className="slider-track-shell">
              <input
                type="range"
                className="industrial-vertical-slider"
                min={0}
                max={5}
                step={0.01}
                value={bandSpeed}
                onChange={handleBandSliderChange}
                aria-label="band speed"
              />
            </div>
            <span className="slider-bottom-label">bnd</span>
          </div>
        </div>
      </div>
    </div>
  )
}
