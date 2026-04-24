'use client'

import { useState } from 'react'
import { getNodeColor } from '@/lib/graph'

type GraphLegendProps = {
  nodeTypeCounts: Array<{ type: string; count: number }>
}

export function GraphLegend({ nodeTypeCounts }: GraphLegendProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="legend-floating">
      <button
        className="legend-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-expanded={visible}
        title={visible ? 'Hide legend' : 'Show legend'}
      >
        Legend
        <svg
          className={`legend-toggle-chevron${visible ? ' legend-toggle-chevron--open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {visible && (
        <div className="legend-chips">
          {nodeTypeCounts.map((entry) => (
            <span key={entry.type} className="legend-chip">
              <i style={{ backgroundColor: getNodeColor(entry.type) }} />
              {entry.type}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
