'use client'

import { useEffect, useMemo, useState } from 'react'

import { GraphViewer } from '@/components/graph-viewer'
import { isOntologyArtifact, type OntologyArtifact } from '@/lib/artifact'
import { isGraphManifest, type GraphManifest } from '@/lib/manifest'
import { deriveGraph, filterGraph } from '@/lib/graph'

type AppState =
  | { status: 'loading-manifest' }
  | { status: 'manifest-error'; message: string }
  | { status: 'loading-graph'; manifest: GraphManifest; activeSlug: string }
  | { status: 'ready'; manifest: GraphManifest; activeSlug: string; artifact: OntologyArtifact }
  | { status: 'graph-error'; manifest: GraphManifest; activeSlug: string; message: string }

function getSlugFromHash(): string {
  const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
  return hash || ''
}

export default function OntologyPage() {
  const [state, setState] = useState<AppState>({ status: 'loading-manifest' })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('ALL')
  const [showIsolates, setShowIsolates] = useState(false)
  const [isSynthesisOpen, setIsSynthesisOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadManifest() {
      try {
        const response = await fetch('/data/manifest.json', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Manifest request failed with ${response.status}`)

        const payload: unknown = await response.json()
        if (!isGraphManifest(payload)) throw new Error('Invalid manifest format')
        if (payload.graphs.length === 0) throw new Error('Manifest contains no graphs')

        if (cancelled) return

        const hashSlug = getSlugFromHash()
        const activeSlug =
          payload.graphs.find((g) => g.slug === hashSlug)?.slug ?? payload.graphs[0].slug

        if (typeof window !== 'undefined') {
          window.location.hash = activeSlug
        }

        setState({ status: 'loading-graph', manifest: payload, activeSlug })
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'manifest-error',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    void loadManifest()
    return () => {
      cancelled = true
    }
  }, [])

  const loadingSlug = state.status === 'loading-graph' ? state.activeSlug : null
  const loadingManifest = state.status === 'loading-graph' ? state.manifest : null

  useEffect(() => {
    if (!loadingSlug || !loadingManifest) return

    let cancelled = false
    const entry = loadingManifest.graphs.find((g) => g.slug === loadingSlug)
    if (!entry) {
      setState((prev) => {
        if (prev.status !== 'loading-graph') return prev
        return {
          status: 'graph-error',
          manifest: prev.manifest,
          activeSlug: prev.activeSlug,
          message: `Graph "${loadingSlug}" not found in manifest`,
        }
      })
      return
    }
    const graphEntry = entry

    async function loadGraph() {
      try {
        const response = await fetch(graphEntry.path, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Graph request failed with ${response.status}`)

        const payload: unknown = await response.json()
        if (!isOntologyArtifact(payload)) throw new Error('Artifact did not match ontology-artifact/v1')

        if (!cancelled) {
          setState((prev) => {
            if (prev.status !== 'loading-graph') return prev
            return { status: 'ready', manifest: prev.manifest, activeSlug: prev.activeSlug, artifact: payload }
          })
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => {
            if (prev.status !== 'loading-graph') return prev
            return {
              status: 'graph-error',
              manifest: prev.manifest,
              activeSlug: prev.activeSlug,
              message: error instanceof Error ? error.message : String(error),
            }
          })
        }
      }
    }

    void loadGraph()
    return () => {
      cancelled = true
    }
  }, [loadingSlug, loadingManifest])

  useEffect(() => {
    function handleHashChange() {
      const slug = getSlugFromHash()
      if (!slug) return

      setState((prev) => {
        if (!('manifest' in prev)) return prev
        if (!prev.manifest.graphs.some((g) => g.slug === slug)) return prev
        if ('activeSlug' in prev && prev.activeSlug === slug) return prev

        setSearchTerm('')
        setSelectedType('ALL')
        setShowIsolates(false)
        setIsSynthesisOpen(false)

        return { status: 'loading-graph', manifest: prev.manifest, activeSlug: slug }
      })
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function handleGraphChange(slug: string) {
    window.location.hash = slug
  }

  const readyArtifact = state.status === 'ready' ? state.artifact : null

  const graph = useMemo(() => {
    if (!readyArtifact) return null
    return deriveGraph(readyArtifact)
  }, [readyArtifact])

  const filteredGraph = useMemo(() => {
    if (!graph) return null
    return filterGraph(graph, { searchTerm, selectedType, showIsolates })
  }, [graph, searchTerm, selectedType, showIsolates])

  const manifest = 'manifest' in state ? state.manifest : null
  const activeSlug = 'activeSlug' in state ? state.activeSlug : ''

  if (state.status === 'loading-manifest') {
    return (
      <div className="viewer-fullscreen">
        <div className="overlay-card">
          <p className="eyebrow">Ontology Viewer</p>
          <h1>Loading</h1>
          <p className="overlay-lede">Fetching graph manifest&hellip;</p>
        </div>
      </div>
    )
  }

  if (state.status === 'manifest-error') {
    return (
      <div className="viewer-fullscreen">
        <div className="overlay-card">
          <p className="eyebrow">Ontology Viewer</p>
          <h1>Unavailable</h1>
          <p className="overlay-lede">{state.message}</p>
        </div>
      </div>
    )
  }

  if (state.status === 'loading-graph') {
    return (
      <div className="viewer-fullscreen">
        <div className="overlay-card">
          <p className="eyebrow">Ontology Viewer</p>
          <h1>Loading graph</h1>
          <p className="overlay-lede">Fetching artifact and preparing layout&hellip;</p>
        </div>
      </div>
    )
  }

  if (state.status === 'graph-error') {
    return (
      <div className="viewer-fullscreen">
        <div className="overlay-card">
          <p className="eyebrow">Ontology Viewer</p>
          <h1>Graph unavailable</h1>
          <p className="overlay-lede">{state.message}</p>
        </div>
      </div>
    )
  }

  if (!graph || !filteredGraph || !manifest) return null

  return (
    <GraphViewer
      graphs={manifest.graphs}
      activeSlug={activeSlug}
      onGraphChange={handleGraphChange}
      nodes={filteredGraph.nodes}
      edges={filteredGraph.edges}
      nodeTypeCounts={graph.stats.typeCounts}
      totalNodeCount={state.artifact.nodes.length}
      totalEdgeCount={state.artifact.edges.length}
      showIsolates={showIsolates}
      searchTerm={searchTerm}
      selectedType={selectedType}
      onSearchTermChange={setSearchTerm}
      onSelectedTypeChange={setSelectedType}
      onShowIsolatesChange={setShowIsolates}
      synthesis={state.artifact.synthesis ?? null}
      isSynthesisOpen={isSynthesisOpen}
      onSynthesisToggle={setIsSynthesisOpen}
    />
  )
}
