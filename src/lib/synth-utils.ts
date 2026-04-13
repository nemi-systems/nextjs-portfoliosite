export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function formatFrequency(value: number): string {
  return `${Math.round(value)}Hz`
}

export function formatFrequencykHz(value: number): string {
  return `${(value / 1000).toFixed(1)}kHz`
}

export function formatLevel(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function formatInteger(value: number): string {
  return `${Math.round(value)}`
}

export function formatDecimal(value: number, decimals: number = 1): string {
  return value.toFixed(decimals)
}