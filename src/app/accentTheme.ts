export type AccentThemeId =
  | 'yellow'
  | 'yellow-flipped'
  | 'purple'
  | 'purple-flipped'
  | 'green'
  | 'green-flipped'
  | 'pink'
  | 'pink-flipped'

export type AccentThemeMode = 'dark' | 'light'

export type AccentThemeConfig = {
  label: string
  /** Digit for the `?t=` share parameter; fixed per theme so shared links survive reordering. */
  shareCode: string
  mode: AccentThemeMode
  hex: string
  rgb: readonly [number, number, number]
  secondaryThemeId?: AccentThemeId
}

/** Catppuccin Latte `base`; light themes paint the page with it instead of flat white. */
export const LIGHT_MODE_BACKGROUND_HEX = '#EFF1F5'

export const ACCENT_THEME_STORAGE_KEY = 'nemi-accent-theme'

/** `?t=<shareCode>` selects (and remembers) a theme, so links can share one. */
export const ACCENT_THEME_QUERY_PARAM = 't'

export const DEFAULT_ACCENT_THEME: AccentThemeId = 'yellow'

export const ACCENT_THEMES: Record<AccentThemeId, AccentThemeConfig> = {
  yellow: {
    label: 'Amber',
    shareCode: '1',
    mode: 'dark',
    hex: '#CA8F31',
    rgb: [202, 143, 49],
    secondaryThemeId: 'yellow-flipped'
  },
  'yellow-flipped': {
    label: 'Amber Light',
    shareCode: '2',
    mode: 'light',
    hex: '#2A8A47',
    rgb: [42, 138, 71]
  },
  purple: {
    label: 'Purple',
    shareCode: '3',
    mode: 'dark',
    hex: '#965FD4',
    rgb: [150, 95, 212],
    secondaryThemeId: 'purple-flipped'
  },
  'purple-flipped': {
    label: 'Purple Light',
    shareCode: '4',
    mode: 'light',
    hex: '#4F8A1F',
    rgb: [79, 138, 31]
  },
  green: {
    label: 'Yellow',
    shareCode: '5',
    mode: 'dark',
    hex: '#E7F40F',
    rgb: [231, 244, 15],
    secondaryThemeId: 'green-flipped'
  },
  'green-flipped': {
    label: 'Yellow Light',
    shareCode: '6',
    mode: 'light',
    hex: '#4C4F69',
    rgb: [76, 79, 105]
  },
  pink: {
    label: 'Pink',
    shareCode: '7',
    mode: 'dark',
    hex: '#FF48A5',
    rgb: [255, 72, 165],
    secondaryThemeId: 'pink-flipped'
  },
  'pink-flipped': {
    label: 'Pink Light',
    shareCode: '8',
    mode: 'light',
    hex: '#0E8A96',
    rgb: [14, 138, 150]
  }
}

export const ACCENT_THEME_IDS = Object.keys(ACCENT_THEMES) as AccentThemeId[]
export const ACCENT_THEME_SWATCH_IDS = ACCENT_THEME_IDS.filter((themeId) => {
  return Boolean(ACCENT_THEMES[themeId].secondaryThemeId)
})

export const isAccentThemeId = (value: string | null | undefined): value is AccentThemeId => {
  return typeof value === 'string' && value in ACCENT_THEMES
}

export const applyAccentThemeToDocument = (theme: AccentThemeId) => {
  const root = document.documentElement
  root.setAttribute('data-accent-theme', theme)
  root.setAttribute('data-theme-mode', ACCENT_THEMES[theme].mode)
}

/** Mirror the active theme into `?theme=` so the address bar is always shareable; the default stays clean. */
export const syncAccentThemeToUrl = (theme: AccentThemeId) => {
  const url = new URL(window.location.href)

  if (theme === DEFAULT_ACCENT_THEME) {
    url.searchParams.delete(ACCENT_THEME_QUERY_PARAM)
  } else {
    url.searchParams.set(ACCENT_THEME_QUERY_PARAM, ACCENT_THEMES[theme].shareCode)
  }

  if (url.href !== window.location.href) {
    window.history.replaceState(window.history.state, '', url)
  }
}

export const getAccentThemeInitScript = () => {
  const themeModes = Object.fromEntries(
    ACCENT_THEME_IDS.map((themeId) => [themeId, ACCENT_THEMES[themeId].mode])
  )
  const codeThemes = Object.fromEntries(
    ACCENT_THEME_IDS.map((themeId) => [ACCENT_THEMES[themeId].shareCode, themeId])
  )

  return `(() => {
    const storageKey = ${JSON.stringify(ACCENT_THEME_STORAGE_KEY)}
    const queryParam = ${JSON.stringify(ACCENT_THEME_QUERY_PARAM)}
    const fallbackTheme = ${JSON.stringify(DEFAULT_ACCENT_THEME)}
    const themeModes = ${JSON.stringify(themeModes)}
    const codeThemes = ${JSON.stringify(codeThemes)}
    const root = document.documentElement
    let theme = fallbackTheme

    try {
      const sharedCode = new URLSearchParams(window.location.search).get(queryParam)
      if (sharedCode && Object.hasOwn(codeThemes, sharedCode)) {
        theme = codeThemes[sharedCode]
        window.localStorage.setItem(storageKey, theme)
      } else {
        const storedTheme = window.localStorage.getItem(storageKey)
        if (storedTheme && Object.hasOwn(themeModes, storedTheme)) {
          theme = storedTheme
        }
      }
    } catch (error) {
      // Storage can be unavailable (privacy mode); fall through with what we resolved.
    }

    root.setAttribute('data-accent-theme', theme)
    root.setAttribute('data-theme-mode', themeModes[theme])
  })()`
}
