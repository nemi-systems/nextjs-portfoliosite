'use client'

import { useMemo } from 'react'
import type { Selection } from '@/components/graph-canvas'
import { getNodeColor, type GraphEdge, type GraphNode } from '@/lib/graph'

type DetailsDrawerProps = {
  selection: Selection
  onSelect: (selection: Selection) => void
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function DetailsDrawer({ selection, onSelect, nodes, edges }: DetailsDrawerProps) {
  const selectedNode =
    selection?.kind === 'node' ? nodes.find((node) => node.id === selection.id) ?? null : null
  const selectedEdge =
    selection?.kind === 'edge' ? edges.find((edge) => edge.id === selection.id) ?? null : null

  const visibleNodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const edgeIdSet = useMemo(() => new Set(edges.map((edge) => edge.id)), [edges])

  const selectedNodeNeighbors = useMemo(() => {
    if (!selectedNode) return []

    return edges
      .filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
      .map((edge) => {
        const neighborId = edge.source === selectedNode.id ? edge.target : edge.source
        const neighbor = visibleNodeById.get(neighborId)
        if (!neighbor) return null
        return { edge, neighbor }
      })
      .filter((entry): entry is { edge: GraphEdge; neighbor: GraphNode } => entry !== null)
      .sort((left, right) => right.neighbor.degree - left.neighbor.degree)
  }, [edges, selectedNode, visibleNodeById])

  const isOpen = selectedNode !== null || selectedEdge !== null

  return (
    <aside className={`details-drawer${isOpen ? ' is-open' : ''}`}>
      <button type="button" className="drawer-close" onClick={() => onSelect(null)}>
        &times;
      </button>

      {selectedNode ? (
        <>
          <div className="details-header">
            <p className="eyebrow">Node</p>
            <h2>{selectedNode.label}</h2>
            <span className="type-pill" style={{ borderColor: `${getNodeColor(selectedNode.type)}66` }}>
              {selectedNode.type}
            </span>
          </div>

          <dl className="details-stats">
            <div>
              <dt>Degree</dt>
              <dd>{selectedNode.degree}</dd>
            </div>
            <div>
              <dt>Confidence</dt>
              <dd>{selectedNode.confidence.toFixed(2)}</dd>
            </div>
          </dl>

          <p className="details-copy">{selectedNode.summary}</p>

          {selectedNode.aliases.length > 0 ? (
            <div className="details-section">
              <h3>Aliases</h3>
              <div className="chip-row">
                {selectedNode.aliases.map((alias) => (
                  <span key={alias} className="chip">
                    {alias}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {selectedNodeNeighbors.length > 0 ? (
            <div className="details-section">
              <h3>Adjacent relations</h3>
              <ul className="detail-list">
                {selectedNodeNeighbors.map(({ edge, neighbor }) => (
                  <li key={edge.id}>
                    <button type="button" onClick={() => onSelect({ kind: 'edge', id: edge.id })}>
                      <strong>{edge.predicate}</strong> &rarr; {neighbor.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="details-section">
            <h3>Evidence</h3>
            <ul className="evidence-list">
              {selectedNode.evidence.map((entry, index) => (
                <li key={`${entry.chunkId}-${index}`}>
                  <p>
                    <strong>{entry.chunkId}</strong> &middot; lines {entry.lineStart}-{entry.lineEnd}
                  </p>
                  <blockquote>{entry.excerpt}</blockquote>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      {selectedEdge ? (
        <>
          <div className="details-header">
            <p className="eyebrow">Edge</p>
            <h2>{selectedEdge.predicate}</h2>
          </div>

          <dl className="details-stats">
            <div>
              <dt>Confidence</dt>
              <dd>{selectedEdge.confidence.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Visible</dt>
              <dd>{edgeIdSet.has(selectedEdge.id) ? 'Yes' : 'No'}</dd>
            </div>
          </dl>

          <p className="details-copy">{selectedEdge.summary}</p>

          <div className="details-section">
            <h3>Endpoints</h3>
            <div className="endpoint-grid">
              <button type="button" onClick={() => onSelect({ kind: 'node', id: selectedEdge.source })}>
                {visibleNodeById.get(selectedEdge.source)?.label ?? selectedEdge.source}
              </button>
              <button type="button" onClick={() => onSelect({ kind: 'node', id: selectedEdge.target })}>
                {visibleNodeById.get(selectedEdge.target)?.label ?? selectedEdge.target}
              </button>
            </div>
          </div>

          <div className="details-section">
            <h3>Evidence</h3>
            <ul className="evidence-list">
              {selectedEdge.evidence.map((entry, index) => (
                <li key={`${entry.chunkId}-${index}`}>
                  <p>
                    <strong>{entry.chunkId}</strong> &middot; lines {entry.lineStart}-{entry.lineEnd}
                  </p>
                  <blockquote>{entry.excerpt}</blockquote>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </aside>
  )
}
