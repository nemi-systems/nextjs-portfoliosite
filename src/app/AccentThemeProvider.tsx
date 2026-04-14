'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  ACCENT_THEME_STORAGE_KEY,
  DEFAULT_ACCENT_THEME,
  type AccentThemeId,
  isAccentThemeId
} from './accentTheme'

type AccentThemeContextValue = {
  theme: AccentThemeId
  setTheme: (theme: AccentThemeId) => void
}

const AccentThemeContext = createContext<AccentThemeContextValue | null>(null)

const applyAccentTheme = (theme: AccentThemeId) => {
  document.documentElement.setAttribute('data-accent-theme', theme)
}

const readAccentTheme = (): AccentThemeId => {
  if (typeof document !== 'undefined') {
    const documentTheme = document.documentElement.getAttribute('data-accent-theme')
    if (isAccentThemeId(documentTheme)) {
      return documentTheme
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const storedTheme = window.localStorage.getItem(ACCENT_THEME_STORAGE_KEY)
      if (isAccentThemeId(storedTheme)) {
        return storedTheme
      }
    } catch {
      return DEFAULT_ACCENT_THEME
    }
  }

  return DEFAULT_ACCENT_THEME
}

export const AccentThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<AccentThemeId>(DEFAULT_ACCENT_THEME)

  useEffect(() => {
    const nextTheme = readAccentTheme()
    setThemeState(nextTheme)
    applyAccentTheme(nextTheme)
  }, [])

  const setTheme = useCallback((nextTheme: AccentThemeId) => {
    setThemeState(nextTheme)
    applyAccentTheme(nextTheme)

    try {
      window.localStorage.setItem(ACCENT_THEME_STORAGE_KEY, nextTheme)
    } catch {
      // Ignore storage failures and keep the in-memory selection.
    }
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return (
    <AccentThemeContext.Provider value={value}>
      {children}
    </AccentThemeContext.Provider>
  )
}

export const useAccentTheme = () => {
  const context = useContext(AccentThemeContext)

  if (!context) {
    throw new Error('useAccentTheme must be used within AccentThemeProvider')
  }

  return context
}
