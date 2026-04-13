const DEG_TO_RAD = Math.PI / 180
const TAU = Math.PI * 2

const GRID_SEGMENTS = 40
const BAND_SEGMENTS = 96
const BAND_GATE_COUNT = 24
const BASE_TILT_DEG = 15

type Vec3 = {
  x: number
  y: number
  z: number
}

type ProjectedPoint = Vec3 & {
  sx: number
  sy: number
}

type UnitCircleSample = {
  angle: number
  cos: number
  sin: number
}

type Rgb = [number, number, number]

type RenderPalette = {
  grid: Rgb
  bandCore: Rgb
  bandGlow: Rgb
  vignetteInner: string
  vignetteOuter: string
}

export type SpeedLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface GlobeShellConfig {
  radiusScale: number
  latitudeCount: number
  longitudeCount: number
  alpha: number
}

export interface GlobeRuntimeState {
  rotX: number
  rotY: number
  rotZ: number
  wobble: number
  bandPhase: number
  paused: boolean
}

export interface GlobeControlState {
  lineWidth: number
  lineDensity: number
  xSpeed: SpeedLevel
  ySpeed: SpeedLevel
  zSpeed: SpeedLevel
  wobbleSpeed: number
  bandSpeed: number
  isFlashing: boolean
}

export interface GlobeFrameInput {
  width: number
  height: number
  dpr: number
  runtime: GlobeRuntimeState
  controls: GlobeControlState
  userRotationXDeg: number
  userRotationYDeg: number
}

export const DEFAULT_SHELLS: readonly GlobeShellConfig[] = [
  {
    radiusScale: 1,
    latitudeCount: 26,
    longitudeCount: 42,
    alpha: 0.88
  },
  {
    radiusScale: 0.66,
    latitudeCount: 22,
    longitudeCount: 36,
    alpha: 0.52
  },
  {
    radiusScale: 0.33,
    latitudeCount: 18,
    longitudeCount: 30,
    alpha: 0.34
  }
]

const LIGHT_BAND_LATITUDES = [-16, 0, 16].map((deg) => degToRad(deg))

const AMBER_PALETTE: RenderPalette = {
  grid: [202, 143, 49],
  bandCore: [255, 246, 181],
  bandGlow: [249, 194, 109],
  vignetteInner: 'rgba(0, 0, 0, 0)',
  vignetteOuter: 'rgba(0, 0, 0, 0.22)'
}

const RED_PALETTE: RenderPalette = {
  grid: [255, 68, 68],
  bandCore: [255, 160, 160],
  bandGlow: [255, 102, 102],
  vignetteInner: 'rgba(0, 0, 0, 0)',
  vignetteOuter: 'rgba(18, 0, 0, 0.2)'
}

const unitCircleCache = new Map<number, UnitCircleSample[]>()

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function degToRad(value: number): number {
  return value * DEG_TO_RAD
}

function toRgbCss(rgb: Rgb): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

function getUnitCircle(segmentCount: number): UnitCircleSample[] {
  const cached = unitCircleCache.get(segmentCount)
  if (cached) {
    return cached
  }

  const samples: UnitCircleSample[] = []
  for (let i = 0; i <= segmentCount; i += 1) {
    const angle = (i / segmentCount) * TAU
    samples.push({
      angle,
      cos: Math.cos(angle),
      sin: Math.sin(angle)
    })
  }

  unitCircleCache.set(segmentCount, samples)
  return samples
}

function rotateX(point: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: point.x,
    y: point.y * cos - point.z * sin,
    z: point.y * sin + point.z * cos
  }
}

function rotateY(point: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: point.x * cos + point.z * sin,
    y: point.y,
    z: -point.x * sin + point.z * cos
  }
}

function rotateZ(point: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
    z: point.z
  }
}

function rotatePoint(point: Vec3, rotationX: number, rotationY: number, rotationZ: number): Vec3 {
  return rotateY(rotateZ(rotateX(point, rotationX), rotationZ), rotationY)
}

function projectPoint(point: Vec3, cameraDistance: number, centerX: number, centerY: number): { x: number; y: number } {
  const denominator = Math.max(0.25, cameraDistance - point.z)
  const perspective = cameraDistance / denominator

  return {
    x: centerX + point.x * perspective,
    y: centerY + point.y * perspective
  }
}

function depthAlpha(z: number, radius: number): number {
  const normalized = clamp((z / radius + 1) * 0.5, 0, 1)
  const eased = normalized * normalized
  return 0.04 + eased * 0.96
}

function drawShellContour(
  ctx: CanvasRenderingContext2D,
  radius: number,
  centerX: number,
  centerY: number,
  width: number,
  alpha: number,
  palette: RenderPalette
): void {
  ctx.globalAlpha = clamp(alpha, 0, 1)
  ctx.strokeStyle = toRgbCss(palette.grid)
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, TAU)
  ctx.stroke()
}

function createCurvePoints(
  segmentCount: number,
  getPoint: (sample: UnitCircleSample) => Vec3,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  cameraDistance: number,
  centerX: number,
  centerY: number
): ProjectedPoint[] {
  const samples = getUnitCircle(segmentCount)

  return samples.map((sample) => {
    const localPoint = getPoint(sample)
    const rotated = rotatePoint(localPoint, rotationX, rotationY, rotationZ)
    const projected = projectPoint(rotated, cameraDistance, centerX, centerY)

    return {
      x: rotated.x,
      y: rotated.y,
      z: rotated.z,
      sx: projected.x,
      sy: projected.y
    }
  })
}

function drawSegmentedCurve(
  ctx: CanvasRenderingContext2D,
  points: ProjectedPoint[],
  radius: number,
  color: Rgb,
  width: number,
  baseAlpha: number,
  intensity?: (index: number, segmentCount: number) => number
): void {
  const segmentCount = points.length - 1

  ctx.strokeStyle = toRgbCss(color)
  ctx.lineWidth = width

  for (let i = 0; i < segmentCount; i += 1) {
    const start = points[i]
    const end = points[i + 1]
    const midZ = (start.z + end.z) * 0.5
    const intensityScale = intensity ? intensity(i, segmentCount) : 1
    const segmentAlpha = baseAlpha * depthAlpha(midZ, radius) * intensityScale

    if (segmentAlpha < 0.01) {
      continue
    }

    ctx.globalAlpha = clamp(segmentAlpha, 0, 1)
    ctx.beginPath()
    ctx.moveTo(start.sx, start.sy)
    ctx.lineTo(end.sx, end.sy)
    ctx.stroke()
  }
}

function drawShellGrid(
  ctx: CanvasRenderingContext2D,
  shell: GlobeShellConfig,
  radius: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  cameraDistance: number,
  centerX: number,
  centerY: number,
  gridWidth: number,
  densityScale: number,
  palette: RenderPalette
): void {
  const latitudeCount = Math.max(8, Math.round(shell.latitudeCount * densityScale))
  const longitudeCount = Math.max(12, Math.round(shell.longitudeCount * densityScale))
  const latitudeStep = Math.PI / (latitudeCount + 1)

  for (let latIndex = 1; latIndex <= latitudeCount; latIndex += 1) {
    const latitude = -Math.PI * 0.5 + latIndex * latitudeStep
    const ringRadius = radius * Math.cos(latitude)
    const ringY = radius * Math.sin(latitude)

    const curve = createCurvePoints(
      GRID_SEGMENTS,
      (sample) => ({
        x: ringRadius * sample.cos,
        y: ringY,
        z: ringRadius * sample.sin
      }),
      rotationX,
      rotationY,
      rotationZ,
      cameraDistance,
      centerX,
      centerY
    )

    drawSegmentedCurve(ctx, curve, radius, palette.grid, gridWidth, shell.alpha)
  }

  for (let lonIndex = 0; lonIndex < longitudeCount; lonIndex += 1) {
    const longitude = (lonIndex / longitudeCount) * TAU

    const curve = createCurvePoints(
      GRID_SEGMENTS,
      (sample) => {
        const horizontal = radius * sample.cos
        return {
          x: horizontal * Math.cos(longitude),
          y: radius * sample.sin,
          z: horizontal * Math.sin(longitude)
        }
      },
      rotationX,
      rotationY,
      rotationZ,
      cameraDistance,
      centerX,
      centerY
    )

    drawSegmentedCurve(ctx, curve, radius, palette.grid, gridWidth, shell.alpha)
  }
}

function drawLightBands(
  ctx: CanvasRenderingContext2D,
  shell: GlobeShellConfig,
  radius: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
  cameraDistance: number,
  centerX: number,
  centerY: number,
  bandCoreWidth: number,
  bandGlowWidth: number,
  bandPhase: number,
  palette: RenderPalette
): void {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const rotationGateOffset = (bandPhase / TAU) * BAND_GATE_COUNT

  for (let ringIndex = 0; ringIndex < LIGHT_BAND_LATITUDES.length; ringIndex += 1) {
    const latitude = LIGHT_BAND_LATITUDES[ringIndex]
    const ringGateOffset = ringIndex % 2 === 1 ? 1 : 0
    const ringRadius = radius * Math.cos(latitude)
    const ringY = radius * Math.sin(latitude)
    const intensity = (index: number, segmentCount: number) => {
      const gatePosition = (index / segmentCount) * BAND_GATE_COUNT + rotationGateOffset + ringGateOffset
      const normalizedGate = ((gatePosition % BAND_GATE_COUNT) + BAND_GATE_COUNT) % BAND_GATE_COUNT
      const gateIndex = Math.floor(normalizedGate)

      return gateIndex % 2 === 0 ? 1 : 0
    }

    const curve = createCurvePoints(
      BAND_SEGMENTS,
      (sample) => ({
        x: ringRadius * sample.cos,
        y: ringY,
        z: ringRadius * sample.sin
      }),
      rotationX,
      rotationY,
      rotationZ,
      cameraDistance,
      centerX,
      centerY
    )

    // Keep a persistent track so the gated pulses read as rotating segments.
    drawSegmentedCurve(
      ctx,
      curve,
      radius,
      palette.bandGlow,
      Math.max(0.8, bandGlowWidth * 0.68),
      shell.alpha * 0.12
    )

    drawSegmentedCurve(
      ctx,
      curve,
      radius,
      palette.bandCore,
      Math.max(0.6, bandCoreWidth * 0.62),
      shell.alpha * 0.16
    )

    drawSegmentedCurve(
      ctx,
      curve,
      radius,
      palette.bandGlow,
      bandGlowWidth,
      shell.alpha * 0.55,
      intensity
    )

    drawSegmentedCurve(
      ctx,
      curve,
      radius,
      palette.bandCore,
      bandCoreWidth,
      Math.min(1, shell.alpha * 1.18),
      intensity
    )
  }

  ctx.restore()
}

function drawVignette(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  palette: RenderPalette
): void {
  const gradient = ctx.createRadialGradient(
    centerX - radius * 0.14,
    centerY - radius * 0.16,
    radius * 0.25,
    centerX,
    centerY,
    radius * 1.2
  )

  gradient.addColorStop(0, palette.vignetteInner)
  gradient.addColorStop(1, palette.vignetteOuter)

  ctx.globalAlpha = 1
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius * 1.06, 0, TAU)
  ctx.fill()
}

function wobbleAmplitudeScale(level: number): number {
  return 0.35 + (clamp(level, 0, 5) / 5) * 0.65
}

export function speedLevelToAngularVelocity(level: SpeedLevel | number): number {
  const effectiveSpeed = level <= 0 ? 0.1 : clamp(level, 0, 5)
  return (TAU * effectiveSpeed) / 28
}

export function wobbleLevelToAngularVelocity(level: number): number {
  const effectiveSpeed = level <= 0 ? 0.1 : clamp(level, 0, 5)
  return (TAU * effectiveSpeed) / 12
}

export function bandLevelToAngularVelocity(level: number): number {
  const effectiveSpeed = clamp(level, 0, 5)
  if (effectiveSpeed === 0) {
    return 0
  }
  return (TAU * effectiveSpeed) / 10
}

export function renderRetroGlobeFrame(ctx: CanvasRenderingContext2D, input: GlobeFrameInput): void {
  const { width, height, dpr, runtime, controls, userRotationXDeg, userRotationYDeg } = input

  if (width <= 0 || height <= 0) {
    return
  }

  const centerX = width * 0.5
  const centerY = height * 0.5
  const baseRadius = Math.min(width, height) * 0.43
  const cameraDistance = baseRadius * 3.8
  const wobbleScale = wobbleAmplitudeScale(controls.wobbleSpeed)
  const wobbleX = Math.sin(runtime.wobble) * degToRad(4) * wobbleScale
  const wobbleZ = Math.sin(runtime.wobble * 0.77) * degToRad(2) * wobbleScale

  const rotationX = degToRad(BASE_TILT_DEG + userRotationXDeg) + runtime.rotX + wobbleX
  const rotationY = degToRad(userRotationYDeg) + runtime.rotY
  const rotationZ = runtime.rotZ + wobbleZ

  const palette = controls.isFlashing ? RED_PALETTE : AMBER_PALETTE
  const densityScale = 0.75 + Math.max(0, controls.lineDensity) * 0.25

  const baseGridWidth = 0.26 + Math.max(0, controls.lineWidth) * 0.24
  const baseBandCoreWidth = 0.95 + Math.max(0, controls.lineWidth) * 0.5
  const baseBandGlowWidth = baseBandCoreWidth * 2.4

  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  DEFAULT_SHELLS.forEach((shell, shellIndex) => {
    const shellRadius = baseRadius * shell.radiusScale
    const shellGridWidth = baseGridWidth * (0.82 + shell.radiusScale * 0.18)
    const shellBandCoreWidth = baseBandCoreWidth * (0.84 + shell.radiusScale * 0.16)
    const shellBandGlowWidth = baseBandGlowWidth * (0.84 + shell.radiusScale * 0.16)

    drawShellContour(
      ctx,
      shellRadius,
      centerX,
      centerY,
      Math.max(0.8, shellGridWidth * 1.05),
      shell.alpha * 0.62,
      palette
    )

    drawShellGrid(
      ctx,
      shell,
      shellRadius,
      rotationX,
      rotationY,
      rotationZ,
      cameraDistance,
      centerX,
      centerY,
      shellGridWidth,
      densityScale,
      palette
    )

    if (shellIndex === 0) {
      drawLightBands(
        ctx,
        shell,
        shellRadius,
        rotationX,
        rotationY,
        rotationZ,
        cameraDistance,
        centerX,
        centerY,
        shellBandCoreWidth,
        shellBandGlowWidth,
        runtime.bandPhase,
        palette
      )
    }
  })

  drawVignette(ctx, centerX, centerY, baseRadius, palette)

  ctx.globalAlpha = 1
  ctx.restore()
}
