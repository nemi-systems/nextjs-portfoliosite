'use client'

import React, { useState } from 'react'

import { useAccentTheme } from './AccentThemeProvider'
import { ACCENT_THEME_SWATCH_IDS, ACCENT_THEMES, type AccentThemeId } from './accentTheme'

type HoverTarget = {
  themeId: AccentThemeId
  target: 'primary' | 'secondary'
}

const isSecondaryRegion = (event: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height

  return x >= 0.42 && y >= 0.42 && x + y >= 1.42
}

export const ColorPicker = () => {
  const { theme, setTheme } = useAccentTheme()
  const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null)

  return (
    <div className="border-t border-box-outline px-4 pb-4 pt-3">
      <div className="mb-3 text-[11px] font-mono uppercase tracking-[0.28em] text-table-text">
        Accent
      </div>
      <div className="grid grid-cols-4 gap-2">
        {ACCENT_THEME_SWATCH_IDS.map((themeId) => {
          const swatch = ACCENT_THEMES[themeId]
          const secondaryThemeId = swatch.secondaryThemeId
          const isPrimaryActive = theme === themeId
          const isSecondaryActive = theme === secondaryThemeId
          const isPrimaryHighlighted = isPrimaryActive || (
            hoverTarget?.themeId === themeId && hoverTarget.target === 'primary'
          )
          const isSecondaryHighlighted = isSecondaryActive || (
            hoverTarget?.themeId === themeId && hoverTarget.target === 'secondary'
          )
          const isActive = isPrimaryActive || isSecondaryActive

          return (
            <button
              key={themeId}
              type="button"
              aria-label={`Set accent color to ${swatch.label.toLowerCase()}`}
              aria-pressed={isActive}
              className={[
                'relative aspect-square border p-1.5 transition-colors focus:outline-none focus:ring-1 focus:ring-primary-green',
                isActive
                  ? 'border-primary-green bg-highlight-bg'
                  : 'border-box-outline bg-box-bg hover:border-box-title-bg hover:bg-highlight-bg'
              ].join(' ')}
              onClick={(event) => {
                if (secondaryThemeId && isSecondaryRegion(event)) {
                  setTheme(secondaryThemeId)
                  return
                }

                setTheme(themeId)
              }}
              onPointerMove={(event) => {
                setHoverTarget({
                  themeId,
                  target: secondaryThemeId && isSecondaryRegion(event) ? 'secondary' : 'primary'
                })
              }}
              onPointerLeave={() => setHoverTarget(null)}
              title={swatch.label}
            >
              <span className="relative block h-full w-full overflow-hidden border border-black/60">
                <span
                  className={[
                    'absolute inset-0 transition-[filter,box-shadow]',
                    isPrimaryHighlighted ? 'brightness-125 shadow-[inset_0_0_0_2px_var(--theme-secondary)]' : ''
                  ].join(' ')}
                  style={{ backgroundColor: swatch.hex }}
                />
                {secondaryThemeId ? (
                  <span
                    className={[
                      'absolute inset-0 transition-[filter,box-shadow]',
                      isSecondaryHighlighted ? 'brightness-125 shadow-[inset_0_0_0_2px_var(--theme-secondary)]' : ''
                    ].join(' ')}
                    style={{
                      backgroundColor: swatch.secondaryHex,
                      clipPath: 'polygon(100% 42%, 100% 100%, 42% 100%)'
                    }}
                  />
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
