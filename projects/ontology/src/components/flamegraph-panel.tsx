'use client'

import { useMemo, useState, type PointerEvent } from 'react'

import type { Selection } from '@/components/graph-canvas'
import type { FlamegraphBar, FlamegraphData, FlamegraphMention } from '@/lib/artifact'
import { getNodeColor, type GraphNode } from '@/lib/graph'

type FlamegraphPanelProps = {
  flamegraph: FlamegraphData
  strataOrder: string[]
  nodes: GraphNode[]
  selection: Selection
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (selection: Selection) => void
}

type PositionedBar = FlamegraphBar & {
  node: GraphNode
  lane: number
  lineStart: number | null
  lineEnd: number | null
}

type StratumRow = {
  index: number
  label: string
  bars: PositionedBar[]
  laneCount: number
}

type TooltipState = {
  barId: string
  x: number
  y: number
}

const LANE_HEIGHT = 16
const ROW_VERTICAL_PADDING = 10

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(3)}%`
}

function formatLineRange(lineStart: number | null, lineEnd: number | null): string {
  if (lineStart === null || lineEnd === null) return 'lines unknown'
  if (lineStart === lineEnd) return `line ${lineStart.toLocaleString()}`
  return `lines ${lineStart.toLocaleString()}-${lineEnd.toLocaleString()}`
}

function getStratumLabel(strataOrder: string[], index: number): string {
  return strataOrder[index] ?? `Overflow ${index}`
}

function formatStratumLabel(label: string): string {
  return label.replaceAll('_', ' ')
}

function getBarLineRanges(
  bars: FlamegraphBar[],
  mentions: FlamegraphMention[],
): Map<string, { lineStart: number; lineEnd: number }> {
  const lineRanges = new Map<string, { lineStart: number; lineEnd: number }>()

  for (const bar of bars) {
    const matchingMentions = mentions.filter(
      (mention) =>
        mention.conceptId === bar.conceptId &&
        mention.chunkId === bar.chunkId &&
        mention.charStart >= bar.charStart &&
        mention.charEnd <= bar.charEnd,
    )

    if (matchingMentions.length === 0) continue

    lineRanges.set(bar.id, {
      lineStart: Math.min(...matchingMentions.map((mention) => mention.lineStart)),
      lineEnd: Math.max(...matchingMentions.map((mention) => mention.lineEnd)),
    })
  }

  return lineRanges
}

function positionBars(
  bars: FlamegraphBar[],
  nodeById: Map<string, GraphNode>,
  lineRangeByBar: Map<string, { lineStart: number; lineEnd: number }>,
): StratumRow[] {
  const barsByStratum = new Map<number, PositionedBar[]>()

  for (const bar of bars) {
    const node = nodeById.get(bar.conceptId)
    if (!node) continue

    const lineRange = lineRangeByBar.get(bar.id)
    const stratumBars = barsByStratum.get(bar.stratumIndex) ?? []
    stratumBars.push({
      ...bar,
      node,
      lane: 0,
      lineStart: lineRange?.lineStart ?? null,
      lineEnd: lineRange?.lineEnd ?? null,
    })
    barsByStratum.set(bar.stratumIndex, stratumBars)
  }

  return [...barsByStratum.entries()]
    .sort(([left], [right]) => right - left)
    .map(([index, stratumBars]) => {
      const laneEnds: number[] = []
      const positioned = [...stratumBars]
        .sort((left, right) => left.charStart - right.charStart || left.charEnd - right.charEnd)
        .map((bar) => {
          let lane = laneEnds.findIndex((end) => end <= bar.charStart)
          if (lane === -1) {
            lane = laneEnds.length
            laneEnds.push(bar.charEnd)
          } else {
            laneEnds[lane] = bar.charEnd
          }

          return { ...bar, lane }
        })

      return {
        index,
        label: '',
        bars: positioned,
        laneCount: Math.max(1, laneEnds.length),
      }
    })
}

export function FlamegraphPanel({
  flamegraph,
  strataOrder,
  nodes,
  selection,
  isOpen,
  onOpenChange,
  onSelect,
}: FlamegraphPanelProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const lineRangeByBar = useMemo(
    () => getBarLineRanges(flamegraph.bars, flamegraph.mentions),
    [flamegraph.bars, flamegraph.mentions],
  )

  const rows = useMemo(() => {
    const positionedRows = positionBars(flamegraph.bars, nodeById, lineRangeByBar)
    return positionedRows.map((row) => ({
      ...row,
      label: getStratumLabel(strataOrder, row.index),
    }))
  }, [flamegraph.bars, lineRangeByBar, nodeById, strataOrder])

  const visibleBarCount = rows.reduce((count, row) => count + row.bars.length, 0)
  const lineNumbers = flamegraph.mentions.flatMap((mention) => [mention.lineStart, mention.lineEnd])
  const minLineNumber = lineNumbers.length > 0 ? Math.min(...lineNumbers) : null
  const maxLineNumber = lineNumbers.length > 0 ? Math.max(...lineNumbers) : null
  const rulerLineNumbers =
    minLineNumber === null || maxLineNumber === null
      ? []
      : Array.from({ length: 5 }, (_, index) =>
          Math.round(minLineNumber + ((maxLineNumber - minLineNumber) * index) / 4),
        )
  const totalMentionCount = rows.reduce(
    (count, row) => count + row.bars.reduce((sum, bar) => sum + bar.mentionCount, 0),
    0,
  )
  const hoveredBar = tooltip
    ? rows.flatMap((row) => row.bars).find((bar) => bar.id === tooltip.barId) ?? null
    : null

  function handleBarPointerMove(event: PointerEvent<HTMLButtonElement>, barId: string) {
    setTooltip({ barId, x: event.clientX + 12, y: event.clientY + 12 })
  }

  return (
    <section
      className={`flamegraph-panel left-drawer left-drawer-timeline${isOpen ? ' is-open' : ''}`}
      aria-label="Timeline"
    >
      <header className="flamegraph-header">
        <button
          type="button"
          className="left-drawer-tab flamegraph-toggle"
          aria-expanded={isOpen}
          onClick={() => onOpenChange(!isOpen)}
        >
          <span>Timeline</span>
          <svg
            className={`flamegraph-chevron${isOpen ? ' is-open' : ''}`}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 4.5L6 8.5L10 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="flamegraph-stats">
          {visibleBarCount}/{flamegraph.bars.length} segments &middot; {totalMentionCount} mentions{' '}
          &middot;{' '}
          {flamegraph.xAxis.documentCharCount.toLocaleString()} chars
          {flamegraph.omittedMentionCount > 0 ? (
            <>
              {' '}
              &middot; {flamegraph.omittedMentionCount} omitted
            </>
          ) : null}
        </div>
      </header>

      {isOpen ? (
        <div className="flamegraph-body">
          {visibleBarCount > 0 ? (
            <>
              <div className="flamegraph-ruler" aria-hidden="true">
                <div className="flamegraph-ruler-label">Line number</div>
                <div className="flamegraph-ruler-numbers">
                  {rulerLineNumbers.length > 0 ? (
                    rulerLineNumbers.map((lineNumber, index) => (
                      <span key={`${lineNumber}-${index}`}>{lineNumber.toLocaleString()}</span>
                    ))
                  ) : (
                    <>
                      <span>Start</span>
                      <span />
                      <span />
                      <span />
                      <span>End</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flamegraph-rows">
                {rows.map((row) => (
                  <div
                    key={row.index}
                    className="flamegraph-row"
                    style={{ minHeight: row.laneCount * LANE_HEIGHT + ROW_VERTICAL_PADDING }}
                  >
                    <div className="flamegraph-row-label" title={row.label}>
                      {formatStratumLabel(row.label)}
                    </div>
                    <div className="flamegraph-track">
                      {row.bars.map((bar) => {
                        const isSelected = selection?.kind === 'node' && selection.id === bar.conceptId
                        const left = clamp(bar.startRatio, 0, 1)
                        const right = clamp(bar.endRatio, left, 1)
                        const height = clamp(5 + Math.log2(bar.heightWeight + 1) * 4, 6, 14)

                        return (
                          <button
                            key={bar.id}
                            type="button"
                            className={`flamegraph-bar${isSelected ? ' is-selected' : ''}`}
                            style={{
                              left: formatPercent(left),
                              width: formatPercent(Math.max(0.0005, right - left)),
                              bottom: row.laneCount * LANE_HEIGHT - (bar.lane + 1) * LANE_HEIGHT + 3,
                              height,
                              backgroundColor: getNodeColor(bar.node.type),
                            }}
                            aria-label={`${bar.node.label}, ${formatLineRange(bar.lineStart, bar.lineEnd)}, ${bar.mentionCount} mention${bar.mentionCount === 1 ? '' : 's'}`}
                            onPointerMove={(event) => handleBarPointerMove(event, bar.id)}
                            onPointerLeave={() => setTooltip((current) => (current?.barId === bar.id ? null : current))}
                            onClick={(event) => {
                              event.stopPropagation()
                              onSelect({ kind: 'node', id: bar.conceptId })
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="flamegraph-empty">No timeline segments match the current graph filters.</p>
          )}
        </div>
      ) : null}

      {hoveredBar ? (
        <div className="flamegraph-tooltip" style={{ left: tooltip?.x, top: tooltip?.y }}>
          <strong>{hoveredBar.node.label}</strong>
          <span>{formatStratumLabel(hoveredBar.node.type)}</span>
          <span>
            {hoveredBar.chunkId} &middot; {formatLineRange(hoveredBar.lineStart, hoveredBar.lineEnd)}
          </span>
          <span>
            {hoveredBar.mentionCount} mention{hoveredBar.mentionCount === 1 ? '' : 's'}
          </span>
        </div>
      ) : null}
    </section>
  )
}
