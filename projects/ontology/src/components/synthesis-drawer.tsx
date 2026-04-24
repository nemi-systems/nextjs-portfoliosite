'use client'

import { useMemo } from 'react'
import type { Selection } from '@/components/graph-canvas'
import type { GraphEdge, GraphNode } from '@/lib/graph'
import type { SynthesisBlock, SynthesisTheme } from '@/lib/artifact'

type SynthesisDrawerProps = {
  synthesis: SynthesisBlock | null
  isOpen: boolean
  onClose: () => void
  nodes: GraphNode[]
  edges: GraphEdge[]
  onSelect: (selection: Selection) => void
}

type SectionSpec = {
  key: 'topLevelDomains' | 'majorContrasts' | 'primaryMetaphors'
  title: string
}

const SECTIONS: SectionSpec[] = [
  { key: 'topLevelDomains', title: 'Top-level domains' },
  { key: 'majorContrasts', title: 'Major contrasts' },
  { key: 'primaryMetaphors', title: 'Primary metaphors' },
]

export function SynthesisDrawer({
  synthesis,
  isOpen,
  onClose,
  nodes,
  edges,
  onSelect,
}: SynthesisDrawerProps) {
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const edgeById = useMemo(() => new Map(edges.map((edge) => [edge.id, edge])), [edges])

  const populatedSections = SECTIONS.filter((section) => (synthesis?.[section.key]?.length ?? 0) > 0)
  const hasAnyContent = synthesis !== null && populatedSections.length > 0

  return (
    <aside className={`synthesis-drawer${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
      <button type="button" className="drawer-close" onClick={onClose} aria-label="Close synthesis">
        &times;
      </button>

      <div className="details-header">
        <p className="eyebrow">Synthesis</p>
        <h2>Document themes</h2>
      </div>

      {!hasAnyContent ? (
        <p className="details-copy">No synthesis available for this artifact.</p>
      ) : (
        populatedSections.map((section) => (
          <div key={section.key} className="details-section">
            <h3>{section.title}</h3>
            <ul className="synthesis-list">
              {synthesis![section.key].map((theme, index) => (
                <SynthesisCard
                  key={`${section.key}-${index}`}
                  theme={theme}
                  nodeById={nodeById}
                  edgeById={edgeById}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </aside>
  )
}

type SynthesisCardProps = {
  theme: SynthesisTheme
  nodeById: Map<string, GraphNode>
  edgeById: Map<string, GraphEdge>
  onSelect: (selection: Selection) => void
}

function SynthesisCard({ theme, nodeById, edgeById, onSelect }: SynthesisCardProps) {
  return (
    <li className="synthesis-card">
      <div className="synthesis-card-head">
        <h4>{theme.label}</h4>
        <span className="synthesis-confidence">{theme.confidence.toFixed(2)}</span>
      </div>
      <p className="details-copy synthesis-summary">{theme.summary}</p>

      {theme.conceptIds.length > 0 ? (
        <div className="synthesis-chip-group">
          <span className="synthesis-chip-label">Concepts</span>
          <div className="chip-row">
            {theme.conceptIds.map((id) => {
              const node = nodeById.get(id)
              return (
                <button
                  key={id}
                  type="button"
                  className="chip chip-button"
                  onClick={() => onSelect({ kind: 'node', id })}
                  disabled={!node}
                  title={node ? undefined : `${id} is not in the visible graph`}
                >
                  {node?.label ?? id}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {theme.relationIds.length > 0 ? (
        <div className="synthesis-chip-group">
          <span className="synthesis-chip-label">Relations</span>
          <div className="chip-row">
            {theme.relationIds.map((id) => {
              const edge = edgeById.get(id)
              return (
                <button
                  key={id}
                  type="button"
                  className="chip chip-button"
                  onClick={() => onSelect({ kind: 'edge', id })}
                  disabled={!edge}
                  title={edge ? undefined : `${id} is not in the visible graph`}
                >
                  {edge?.predicate ?? id}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </li>
  )
}
