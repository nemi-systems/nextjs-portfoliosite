'use client'

import React from 'react'

import { useAccentTheme } from './AccentThemeProvider'
import { ACCENT_THEME_IDS, ACCENT_THEMES } from './accentTheme'

export const ColorPicker = () => {
  const { theme, setTheme } = useAccentTheme()

  return (
    <div className="border-t border-box-outline px-4 pb-4 pt-3">
      <div className="mb-3 text-[11px] font-mono uppercase tracking-[0.28em] text-table-text">
        Accent
      </div>
      <div className="grid grid-cols-4 gap-2">
        {ACCENT_THEME_IDS.map((themeId) => {
          const swatch = ACCENT_THEMES[themeId]
          const isActive = theme === themeId

          return (
            <button
              key={themeId}
              type="button"
              aria-label={`Set accent color to ${swatch.label.toLowerCase()}`}
              aria-pressed={isActive}
              className={[
                'aspect-square border p-1.5 transition-colors focus:outline-none focus:ring-1 focus:ring-primary-green',
                isActive
                  ? 'border-primary-green bg-highlight-bg'
                  : 'border-box-outline bg-box-bg hover:border-box-title-bg hover:bg-highlight-bg'
              ].join(' ')}
              onClick={() => setTheme(themeId)}
              title={swatch.label}
            >
              <span
                className="relative block h-full w-full overflow-hidden border border-black/60"
                style={{ backgroundColor: swatch.hex }}
              >
                <span
                  className="absolute inset-0"
                  style={{
                    backgroundColor: swatch.secondaryHex,
                    clipPath: 'polygon(100% 42%, 100% 100%, 42% 100%)'
                  }}
                />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
