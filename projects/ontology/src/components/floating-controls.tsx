'use client'

import { useEffect, useRef } from 'react'
import type { GraphManifestEntry } from '@/lib/manifest'

type FloatingControlsProps = {
  graphs: GraphManifestEntry[]
  activeSlug: string
  onGraphChange: (slug: string) => void
  searchTerm: string
  onSearchTermChange: (value: string) => void
  selectedType: string
  onSelectedTypeChange: (value: string) => void
  nodeTypeCounts: Array<{ type: string; count: number }>
  showIsolates: boolean
  onShowIsolatesChange: (value: boolean) => void
  onResetView: () => void
  visibleNodes: number
  totalNodes: number
  visibleEdges: number
  totalEdges: number
  hasSynthesis: boolean
  isSynthesisOpen: boolean
  onSynthesisToggle: (open: boolean) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function formatTypeLabel(label: string): string {
  return label.replaceAll('_', ' ')
}

export function FloatingControls({
  graphs,
  activeSlug,
  onGraphChange,
  searchTerm,
  onSearchTermChange,
  selectedType,
  onSelectedTypeChange,
  nodeTypeCounts,
  showIsolates,
  onShowIsolatesChange,
  onResetView,
  visibleNodes,
  totalNodes,
  visibleEdges,
  totalEdges,
  hasSynthesis,
  isSynthesisOpen,
  onSynthesisToggle,
  isOpen,
  onOpenChange,
}: FloatingControlsProps) {
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={`floating-controls left-drawer left-drawer-menu${isOpen ? ' is-open' : ''}`}>
      <button
        type="button"
        className="left-drawer-tab"
        aria-expanded={isOpen}
        onClick={() => onOpenChange(!isOpen)}
      >
        Menu
      </button>

      <div className="floating-controls-content">
        {graphs.length > 1 ? (
          <select
            className="graph-switcher"
            value={activeSlug}
            onChange={(event) => onGraphChange(event.target.value)}
          >
            {graphs.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.title}
              </option>
            ))}
          </select>
        ) : (
          <div className="graph-title">{graphs[0]?.title}</div>
        )}

        <input
          ref={searchRef}
          type="search"
          className="control-search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Search nodes..."
        />

        <select
          className="control-select"
          value={selectedType}
          onChange={(event) => onSelectedTypeChange(event.target.value)}
        >
          <option value="ALL">All types</option>
          {nodeTypeCounts.map((entry) => (
            <option key={entry.type} value={entry.type}>
              {formatTypeLabel(entry.type)} ({entry.count})
            </option>
          ))}
        </select>

        <div className="control-row">
          <label className="control-toggle">
            <input
              type="checkbox"
              checked={showIsolates}
              onChange={(event) => onShowIsolatesChange(event.target.checked)}
            />
            <span>Isolates</span>
          </label>

          <button type="button" className="control-button" onClick={onResetView}>
            Reset
          </button>
        </div>

        {hasSynthesis ? (
          <button
            type="button"
            className="control-button control-button-synthesis"
            aria-pressed={isSynthesisOpen}
            onClick={() => onSynthesisToggle(!isSynthesisOpen)}
          >
            {isSynthesisOpen ? 'Hide synthesis' : 'Show synthesis'}
          </button>
        ) : null}

        <div className="control-stats">
          {visibleNodes}/{totalNodes} nodes &middot; {visibleEdges}/{totalEdges} edges
        </div>
      </div>
    </div>
  )
}
