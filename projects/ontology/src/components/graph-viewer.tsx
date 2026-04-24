'use client'

import { useCallback, useRef, useState } from 'react'
import { GraphCanvas, type GraphCanvasHandle, type Selection } from '@/components/graph-canvas'
import { FloatingControls } from '@/components/floating-controls'
import { DetailsDrawer } from '@/components/details-drawer'
import { SynthesisDrawer } from '@/components/synthesis-drawer'
import { GraphLegend } from '@/components/graph-legend'
import type { GraphManifestEntry } from '@/lib/manifest'
import type { GraphEdge, GraphNode } from '@/lib/graph'
import type { SynthesisBlock } from '@/lib/artifact'

type GraphViewerProps = {
  graphs: GraphManifestEntry[]
  activeSlug: string
  onGraphChange: (slug: string) => void
  nodes: GraphNode[]
  edges: GraphEdge[]
  nodeTypeCounts: Array<{ type: string; count: number }>
  totalNodeCount: number
  totalEdgeCount: number
  showIsolates: boolean
  searchTerm: string
  selectedType: string
  onSearchTermChange: (value: string) => void
  onSelectedTypeChange: (value: string) => void
  onShowIsolatesChange: (value: boolean) => void
  synthesis: SynthesisBlock | null
  isSynthesisOpen: boolean
  onSynthesisToggle: (open: boolean) => void
}

export function GraphViewer({
  graphs,
  activeSlug,
  onGraphChange,
  nodes,
  edges,
  nodeTypeCounts,
  totalNodeCount,
  totalEdgeCount,
  showIsolates,
  searchTerm,
  selectedType,
  onSearchTermChange,
  onSelectedTypeChange,
  onShowIsolatesChange,
  synthesis,
  isSynthesisOpen,
  onSynthesisToggle,
}: GraphViewerProps) {
  const canvasRef = useRef<GraphCanvasHandle | null>(null)
  const [selection, setSelection] = useState<Selection>(null)

  const handleSelect = useCallback((next: Selection) => {
    setSelection(next)
  }, [])

  return (
    <div className="viewer-fullscreen">
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        searchTerm={searchTerm}
        showIsolates={showIsolates}
        selection={selection}
        onSelect={handleSelect}
        canvasRef={canvasRef}
      />

      <FloatingControls
        graphs={graphs}
        activeSlug={activeSlug}
        onGraphChange={onGraphChange}
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        selectedType={selectedType}
        onSelectedTypeChange={onSelectedTypeChange}
        nodeTypeCounts={nodeTypeCounts}
        showIsolates={showIsolates}
        onShowIsolatesChange={onShowIsolatesChange}
        onResetView={() => canvasRef.current?.resetView()}
        visibleNodes={nodes.length}
        totalNodes={totalNodeCount}
        visibleEdges={edges.length}
        totalEdges={totalEdgeCount}
        hasSynthesis={synthesis !== null}
        isSynthesisOpen={isSynthesisOpen}
        onSynthesisToggle={onSynthesisToggle}
      />

      <SynthesisDrawer
        synthesis={synthesis}
        isOpen={isSynthesisOpen}
        onClose={() => onSynthesisToggle(false)}
        nodes={nodes}
        edges={edges}
        onSelect={handleSelect}
      />

      <DetailsDrawer
        selection={selection}
        onSelect={handleSelect}
        nodes={nodes}
        edges={edges}
      />

      <GraphLegend nodeTypeCounts={nodeTypeCounts} />
    </div>
  )
}
