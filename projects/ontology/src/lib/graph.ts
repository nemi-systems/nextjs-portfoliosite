import type { OntologyArtifact, OntologyEdge, OntologyNode } from '@/lib/artifact'

export type GraphNode = Omit<OntologyNode, 'degree'> & {
  degree: number
  hasEdges: boolean
  searchText: string
}

export type GraphEdge = OntologyEdge

export type GraphStats = {
  connectedNodeCount: number
  isolatedNodeCount: number
  typeCounts: Array<{ type: string; count: number }>
}

export type DerivedGraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  nodeById: Map<string, GraphNode>
  adjacency: Map<string, string[]>
  connectedNodeIds: Set<string>
  stats: GraphStats
}

export type GraphFilterState = {
  searchTerm: string
  selectedType: string
  showIsolates: boolean
}

export type FilteredGraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  nodeIds: Set<string>
  matchingNodeIds: Set<string>
}

export const HUB_LABEL_DEGREE = 2

export const TYPE_COLORS: Record<string, string> = {
  AGENT: '#f4b680',
  COSMOLOGICAL_STRUCTURE: '#6fd3ff',
  DOMAIN: '#b8ef8a',
  ENTITY: '#f8ee9a',
  EPISTEMIC_MODE: '#ef93d7',
  EVENT: '#f67d86',
  METAPHOR: '#e0a5ff',
  NARRATIVE_FORM: '#95a9ff',
  PERSPECTIVE: '#97f0dd',
  PROCESS: '#ffcf6d',
  QUALITY: '#ff9e6d',
  RELATION: '#d0c5ff',
  SYMBOL: '#9dd6ff',
}

export function getNodeColor(type: string): string {
  return TYPE_COLORS[type] ?? '#d0d7df'
}

export function deriveGraph(artifact: OntologyArtifact): DerivedGraph {
  const degreeById = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const node of artifact.nodes) {
    degreeById.set(node.id, 0)
    adjacency.set(node.id, [])
  }

  for (const edge of artifact.edges) {
    degreeById.set(edge.source, (degreeById.get(edge.source) ?? 0) + 1)
    degreeById.set(edge.target, (degreeById.get(edge.target) ?? 0) + 1)
    adjacency.get(edge.source)?.push(edge.target)
    adjacency.get(edge.target)?.push(edge.source)
  }

  const nodes = artifact.nodes.map((node) => {
    const degree = degreeById.get(node.id) ?? 0
    return {
      ...node,
      degree,
      hasEdges: degree > 0,
      searchText: [
        node.label,
        node.type,
        node.summary,
        ...node.aliases,
        ...node.evidence.map((entry) => entry.excerpt),
      ]
        .join(' ')
        .toLowerCase(),
    }
  })

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const connectedNodeIds = new Set(nodes.filter((node) => node.hasEdges).map((node) => node.id))
  const typeCountsMap = new Map<string, number>()

  for (const node of nodes) {
    typeCountsMap.set(node.type, (typeCountsMap.get(node.type) ?? 0) + 1)
  }

  const typeCounts = [...typeCountsMap.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type))

  return {
    nodes,
    edges: artifact.edges,
    nodeById,
    adjacency,
    connectedNodeIds,
    stats: {
      connectedNodeCount: connectedNodeIds.size,
      isolatedNodeCount: nodes.length - connectedNodeIds.size,
      typeCounts,
    },
  }
}

export function filterGraph(graph: DerivedGraph, filters: GraphFilterState): FilteredGraph {
  const normalizedQuery = filters.searchTerm.trim().toLowerCase()
  const matchingNodeIds = new Set<string>()

  for (const node of graph.nodes) {
    const typeMatches = filters.selectedType === 'ALL' || node.type === filters.selectedType
    const isolateMatches = filters.showIsolates || node.hasEdges
    const searchMatches =
      normalizedQuery.length === 0 || node.searchText.includes(normalizedQuery)

    if (typeMatches && isolateMatches && searchMatches) {
      matchingNodeIds.add(node.id)
    }
  }

  const edges = graph.edges.filter(
    (edge) => matchingNodeIds.has(edge.source) && matchingNodeIds.has(edge.target),
  )
  const connectedIds = new Set<string>()

  for (const edge of edges) {
    connectedIds.add(edge.source)
    connectedIds.add(edge.target)
  }

  const nodes = graph.nodes.filter((node) => {
    if (!matchingNodeIds.has(node.id)) {
      return false
    }
    if (filters.showIsolates) {
      return true
    }
    return connectedIds.has(node.id)
  })

  return {
    nodes,
    edges,
    nodeIds: new Set(nodes.map((node) => node.id)),
    matchingNodeIds,
  }
}

export function getNodeRadius(node: GraphNode): number {
  return 4 + Math.min(14, Math.sqrt(node.degree + 1) * 2.1)
}
