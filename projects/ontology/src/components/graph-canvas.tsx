'use client'

import type { PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useMemo, useRef, useState, startTransition } from 'react'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'

import {
  getNodeColor,
  getNodeRadius,
  HUB_LABEL_DEGREE,
  type GraphEdge,
  type GraphNode,
} from '@/lib/graph'

export type Selection =
  | { kind: 'node'; id: string }
  | { kind: 'edge'; id: string }
  | null

type LayoutNode = SimulationNodeDatum & {
  id: string
  label: string
  type: string
  degree: number
  radius: number
  hasEdges: boolean
  matchesSearch: boolean
  color: string
}

type LayoutEdge = Omit<GraphEdge, 'source' | 'target'> &
  SimulationLinkDatum<LayoutNode> & {
    source: LayoutNode
    target: LayoutNode
  }

type Dimensions = {
  width: number
  height: number
}

const INITIAL_DIMENSIONS: Dimensions = { width: 960, height: 720 }
const DEFAULT_NODE_LABEL_LIMIT = 90

export type GraphCanvasHandle = {
  resetView: () => void
}

type GraphCanvasProps = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  searchTerm: string
  showIsolates: boolean
  selection: Selection
  onSelect: (selection: Selection) => void
  canvasRef?: React.RefObject<GraphCanvasHandle | null>
}

export function GraphCanvas({
  nodes,
  edges,
  searchTerm,
  showIsolates,
  selection,
  onSelect,
  canvasRef,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const simulationRef = useRef<ReturnType<typeof forceSimulation<LayoutNode>> | null>(null)
  const dragNodeIdRef = useRef<string | null>(null)
  const [dimensions, setDimensions] = useState<Dimensions>(INITIAL_DIMENSIONS)
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)

  const layout = useMemo(() => {
    const searchQuery = searchTerm.trim().toLowerCase()
    const matchNodeIds = new Set<string>()
    const layoutNodes: LayoutNode[] = nodes.map((node): LayoutNode => {
      const matchesSearch =
        searchQuery.length > 0 &&
        [node.label, node.summary, node.type, ...node.aliases]
          .join(' ')
          .toLowerCase()
          .includes(searchQuery)

      if (matchesSearch) {
        matchNodeIds.add(node.id)
      }

      return {
        id: node.id,
        label: node.label,
        type: node.type,
        degree: node.degree,
        radius: getNodeRadius(node),
        hasEdges: node.hasEdges,
        matchesSearch,
        color: getNodeColor(node.type),
      }
    })

    const nodeById = new Map(layoutNodes.map((node) => [node.id, node]))
    const layoutEdges = edges
      .map((edge) => {
        const source = nodeById.get(edge.source)
        const target = nodeById.get(edge.target)
        if (!source || !target) return null
        return { ...edge, source, target } satisfies LayoutEdge
      })
      .filter((edge): edge is LayoutEdge => edge !== null)

    return { nodes: layoutNodes, edges: layoutEdges, nodeById, matchNodeIds }
  }, [searchTerm, edges, nodes])

  // Clear selection when filtered out
  useEffect(() => {
    if (selection?.kind === 'node' && !layout.nodeById.has(selection.id)) {
      onSelect(null)
    }
    if (selection?.kind === 'edge' && !layout.edges.some((edge) => edge.id === selection.id)) {
      onSelect(null)
    }
  }, [layout.edges, layout.nodeById, selection, onSelect])

  // Resize observer
  useEffect(() => {
    const element = viewportRef.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const nextWidth = Math.max(320, Math.floor(entry.contentRect.width))
      const nextHeight = Math.max(480, Math.floor(entry.contentRect.height))
      setDimensions((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight },
      )
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Zoom behavior
  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement) return

    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 4.5])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        setTransform(event.transform)
      })

    zoomBehaviorRef.current = behavior
    select(svgElement).call(behavior)
    select(svgElement).call(behavior.transform, zoomIdentity)

    return () => {
      select(svgElement).on('.zoom', null)
    }
  }, [])

  // Expose resetView via ref
  useEffect(() => {
    if (!canvasRef) return
    canvasRef.current = {
      resetView() {
        if (!svgRef.current || !zoomBehaviorRef.current) return
        select(svgRef.current).call(zoomBehaviorRef.current.transform, zoomIdentity)
      },
    }
  }, [canvasRef])

  // Force simulation
  useEffect(() => {
    const current = simulationRef.current
    if (current) current.stop()

    const { width, height } = dimensions
    const centerX = width / 2
    const centerY = height / 2
    const outerRadius = Math.min(width, height) * 0.36
    const connectedRadius = Math.min(width, height) * 0.18

    const positionedNodes = layout.nodes.map((node, index) => {
      const angle = (index / Math.max(1, layout.nodes.length)) * Math.PI * 2
      if (node.hasEdges) {
        node.x = centerX + Math.cos(angle) * connectedRadius * 0.4
        node.y = centerY + Math.sin(angle) * connectedRadius * 0.4
      } else {
        node.x = centerX + Math.cos(angle) * outerRadius
        node.y = centerY + Math.sin(angle) * outerRadius
      }
      return node
    })

    const simulation = forceSimulation(positionedNodes)
      .force(
        'link',
        forceLink<LayoutNode, LayoutEdge>(layout.edges)
          .id((node: LayoutNode) => node.id)
          .distance((edge) => {
            const source = edge.source as LayoutNode
            const target = edge.target as LayoutNode
            return 42 + Math.max(source.radius, target.radius) * 2.4
          })
          .strength(0.18),
      )
      .force(
        'charge',
        forceManyBody<LayoutNode>().strength((node) => (node.hasEdges ? -185 : -70)),
      )
      .force(
        'collision',
        forceCollide<LayoutNode>().radius((node) => node.radius + 4).strength(0.85),
      )
      .force('center', forceCenter(centerX, centerY))
      .force(
        'isolateRing',
        forceRadial<LayoutNode>(
          (node) => (node.hasEdges ? Math.min(width, height) * 0.05 : outerRadius),
          centerX,
          centerY,
        ).strength((node) => (node.hasEdges ? 0.015 : 0.16)),
      )
      .alpha(1)
      .alphaDecay(0.05)
      .velocityDecay(0.4)

    simulation.on('tick', () => {
      startTransition(() => {
        setLayoutVersion((v) => v + 1)
      })
    })

    simulationRef.current = simulation

    const stopTimer = window.setTimeout(() => simulation.stop(), 2800)
    return () => {
      window.clearTimeout(stopTimer)
      simulation.stop()
    }
  }, [dimensions, layout.edges, layout.nodes, showIsolates])

  const labelIds = useMemo(() => {
    const ids = new Set<string>()
    const highPriorityNodes = [...nodes]
      .sort((left, right) => right.degree - left.degree || right.confidence - left.confidence)
      .slice(0, DEFAULT_NODE_LABEL_LIMIT)

    for (const node of highPriorityNodes) {
      if (node.degree >= HUB_LABEL_DEGREE) ids.add(node.id)
    }

    if (selection?.kind === 'node') ids.add(selection.id)
    if (hoveredNodeId) ids.add(hoveredNodeId)
    for (const id of layout.matchNodeIds) ids.add(id)

    return ids
  }, [hoveredNodeId, layout.matchNodeIds, nodes, selection])

  function toGraphPoint(event: ReactPointerEvent<SVGElement>) {
    const bounds = svgRef.current?.getBoundingClientRect()
    const localX = event.clientX - (bounds?.left ?? 0)
    const localY = event.clientY - (bounds?.top ?? 0)
    return transform.invert([localX, localY])
  }

  function handleNodePointerDown(event: ReactPointerEvent<SVGCircleElement>, nodeId: string) {
    event.stopPropagation()
    if (event.button !== 1) return
    event.preventDefault()

    const activeNode = layout.nodeById.get(nodeId)
    const simulation = simulationRef.current
    const svgElement = svgRef.current
    if (!activeNode || !simulation || !svgElement) return

    dragNodeIdRef.current = nodeId
    svgElement.setPointerCapture(event.pointerId)

    const nextPoint = toGraphPoint(event)
    activeNode.fx = nextPoint[0]
    activeNode.fy = nextPoint[1]
    simulation.alpha(0.35).restart()
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const activeId = dragNodeIdRef.current
    if (!activeId) return
    const activeNode = layout.nodeById.get(activeId)
    if (!activeNode) return

    const nextPoint = toGraphPoint(event)
    activeNode.fx = nextPoint[0]
    activeNode.fy = nextPoint[1]
    setLayoutVersion((v) => v + 1)
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const activeId = dragNodeIdRef.current
    if (!activeId) return

    const activeNode = layout.nodeById.get(activeId)
    const simulation = simulationRef.current
    dragNodeIdRef.current = null

    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId)
    }

    if (activeNode) {
      activeNode.fx = null
      activeNode.fy = null
    }
    simulation?.alpha(0.28).restart()
  }

  function handleBackgroundClick() {
    onSelect(null)
  }

  // suppress unused-var lint for layoutVersion (drives re-render)
  void layoutVersion

  return (
    <div className="graph-viewport" ref={viewportRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="graph-canvas"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleBackgroundClick}
      >
        <defs>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="edgeArrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4.5"
            markerHeight="4.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" className="edge-arrow" />
          </marker>
          <marker
            id="edgeArrowActive"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" className="edge-arrow-active" />
          </marker>
        </defs>

        <g transform={transform.toString()}>
          <g className="edge-layer">
            {layout.edges.map((edge) => {
              const source = edge.source as LayoutNode
              const target = edge.target as LayoutNode
              const dx = (target.x ?? 0) - (source.x ?? 0)
              const dy = (target.y ?? 0) - (source.y ?? 0)
              const distance = Math.max(1, Math.hypot(dx, dy))
              const unitX = dx / distance
              const unitY = dy / distance
              const x1 = (source.x ?? 0) + unitX * (source.radius + 2)
              const y1 = (source.y ?? 0) + unitY * (source.radius + 2)
              const x2 = (target.x ?? 0) - unitX * (target.radius + 5)
              const y2 = (target.y ?? 0) - unitY * (target.radius + 5)
              const isSelected = selection?.kind === 'edge' && selection.id === edge.id
              const isHovered = hoveredEdgeId === edge.id

              return (
                <line
                  key={edge.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={`graph-edge${isSelected ? ' is-selected' : ''}${isHovered ? ' is-hovered' : ''}`}
                  strokeWidth={Math.max(1.1, edge.confidence * 2.8)}
                  markerEnd={isSelected || isHovered ? 'url(#edgeArrowActive)' : 'url(#edgeArrow)'}
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId((c) => (c === edge.id ? null : c))}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelect({ kind: 'edge', id: edge.id })
                  }}
                />
              )
            })}
          </g>

          <g className="edge-label-layer">
            {layout.edges.map((edge) => {
              const source = edge.source as LayoutNode
              const target = edge.target as LayoutNode
              const dx = (target.x ?? 0) - (source.x ?? 0)
              const dy = (target.y ?? 0) - (source.y ?? 0)
              const distance = Math.hypot(dx, dy)
              const unitX = dx / Math.max(1, distance)
              const unitY = dy / Math.max(1, distance)
              const x1 = (source.x ?? 0) + unitX * (source.radius + 2)
              const y1 = (source.y ?? 0) + unitY * (source.radius + 2)
              const x2 = (target.x ?? 0) - unitX * (target.radius + 5)
              const y2 = (target.y ?? 0) - unitY * (target.radius + 5)
              const midX = (x1 + x2) / 2
              const midY = (y1 + y2) / 2
              const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI
              const angle = rawAngle > 90 || rawAngle < -90 ? rawAngle + 180 : rawAngle
              const labelWidth = Math.min(86, Math.max(34, edge.predicate.length * 4.7 + 10))
              const isSelected = selection?.kind === 'edge' && selection.id === edge.id
              const isHovered = hoveredEdgeId === edge.id
              const isVisible = distance > 74 || isSelected || isHovered

              return (
                <g
                  key={edge.id}
                  className={`edge-label${isVisible ? '' : ' is-suppressed'}${isSelected ? ' is-selected' : ''}${isHovered ? ' is-hovered' : ''}`}
                  transform={`translate(${midX}, ${midY}) rotate(${angle})`}
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId((c) => (c === edge.id ? null : c))}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelect({ kind: 'edge', id: edge.id })
                  }}
                >
                  <rect x={-labelWidth / 2} y={-6} width={labelWidth} height={12} rx={6} />
                  <text y={2.5}>{edge.predicate}</text>
                </g>
              )
            })}
          </g>

          <g className="node-layer">
            {layout.nodes.map((node) => {
              const isSelected = selection?.kind === 'node' && selection.id === node.id
              const isHovered = hoveredNodeId === node.id

              return (
                <circle
                  key={node.id}
                  cx={node.x ?? 0}
                  cy={node.y ?? 0}
                  r={node.radius}
                  fill={node.color}
                  filter={node.matchesSearch || isSelected ? 'url(#nodeGlow)' : undefined}
                  className={`graph-node${isSelected ? ' is-selected' : ''}${isHovered ? ' is-hovered' : ''}${node.matchesSearch ? ' is-match' : ''}`}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId((c) => (c === node.id ? null : c))}
                  onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                  onAuxClick={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelect({ kind: 'node', id: node.id })
                  }}
                />
              )
            })}
          </g>

          <g className="label-layer">
            {layout.nodes
              .filter((node) => labelIds.has(node.id))
              .map((node) => (
                <text
                  key={node.id}
                  x={(node.x ?? 0) + node.radius + 5}
                  y={(node.y ?? 0) + 4}
                  className="graph-label"
                >
                  {node.label}
                </text>
              ))}
          </g>
        </g>
      </svg>
    </div>
  )
}
