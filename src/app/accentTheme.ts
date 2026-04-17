export type AccentThemeId =
  | 'yellow'
  | 'yellow-flipped'
  | 'purple'
  | 'purple-flipped'
  | 'green'
  | 'green-flipped'
  | 'pink'
  | 'pink-flipped'

export type AccentThemeConfig = {
  label: string
  hex: string
  rgb: readonly [number, number, number]
  secondaryHex: string
  secondaryThemeId?: AccentThemeId
}

export const ACCENT_THEME_STORAGE_KEY = 'nemi-accent-theme'

export const DEFAULT_ACCENT_THEME: AccentThemeId = 'yellow'

export const ACCENT_THEMES: Record<AccentThemeId, AccentThemeConfig> = {
  yellow: {
    label: 'Amber',
    hex: '#CA8F31',
    rgb: [202, 143, 49],
    secondaryHex: '#5AFD81',
    secondaryThemeId: 'yellow-flipped'
  },
  'yellow-flipped': {
    label: 'Amber Flipped',
    hex: '#5AFD81',
    rgb: [90, 253, 129],
    secondaryHex: '#CA8F31'
  },
  purple: {
    label: 'Purple',
    hex: '#965FD4',
    rgb: [150, 95, 212],
    secondaryHex: '#8BD450',
    secondaryThemeId: 'purple-flipped'
  },
  'purple-flipped': {
    label: 'Purple Flipped',
    hex: '#8BD450',
    rgb: [139, 212, 80],
    secondaryHex: '#965FD4'
  },
  green: {
    label: 'Yellow',
    hex: '#E7F40F',
    rgb: [231, 244, 15],
    secondaryHex: '#FFFFFF',
    secondaryThemeId: 'green-flipped'
  },
  'green-flipped': {
    label: 'Yellow Flipped',
    hex: '#FFFFFF',
    rgb: [255, 255, 255],
    secondaryHex: '#E7F40F'
  },
  pink: {
    label: 'Pink',
    hex: '#FF48A5',
    rgb: [255, 72, 165],
    secondaryHex: '#00FFFF',
    secondaryThemeId: 'pink-flipped'
  },
  'pink-flipped': {
    label: 'Pink Flipped',
    hex: '#00FFFF',
    rgb: [0, 255, 255],
    secondaryHex: '#FF48A5'
  }
}

export const ACCENT_THEME_IDS = Object.keys(ACCENT_THEMES) as AccentThemeId[]
export const ACCENT_THEME_SWATCH_IDS = ACCENT_THEME_IDS.filter((themeId) => {
  return Boolean(ACCENT_THEMES[themeId].secondaryThemeId)
})

export const isAccentThemeId = (value: string | null | undefined): value is AccentThemeId => {
  return typeof value === 'string' && value in ACCENT_THEMES
}

export const getAccentThemeInitScript = () => {
  return `(() => {
    const storageKey = ${JSON.stringify(ACCENT_THEME_STORAGE_KEY)}
    const fallbackTheme = ${JSON.stringify(DEFAULT_ACCENT_THEME)}
    const validThemes = new Set(${JSON.stringify(ACCENT_THEME_IDS)})
    const root = document.documentElement

    try {
      const storedTheme = window.localStorage.getItem(storageKey)
      const theme = validThemes.has(storedTheme) ? storedTheme : fallbackTheme
      root.setAttribute('data-accent-theme', theme)
    } catch (error) {
      root.setAttribute('data-accent-theme', fallbackTheme)
    }
  })()`
}
