export type OntologyEvidence = {
  chunkId: string
  lineStart: number
  lineEnd: number
  excerpt: string
}

export type OntologyChunk = {
  id: string
  headingPath: string[]
  lineStart: number
  lineEnd: number
  charCount: number
  ordinal?: number
  headingGroup?: string
}

export type OntologyNode = {
  id: string
  label: string
  type: string
  aliases: string[]
  summary: string
  confidence: number
  evidence: OntologyEvidence[]
  stratumIndex?: number
  narrativePosition?: OntologyNarrativePosition | null
  degree?: OntologyDegree
  rankScore?: number
}

export type OntologyEdge = {
  id: string
  source: string
  target: string
  predicate: string
  summary: string
  confidence: number
  evidence: OntologyEvidence[]
}

export type SynthesisTheme = {
  label: string
  summary: string
  conceptIds: string[]
  relationIds: string[]
  confidence: number
}

export type SynthesisBlock = {
  topLevelDomains: SynthesisTheme[]
  majorContrasts: SynthesisTheme[]
  primaryMetaphors: SynthesisTheme[]
  organizingOntology: unknown
}

export type OntologyNarrativePosition = {
  firstChunk: string
  lastChunk: string
  meanChunkOrdinal: number
  spanChunks: number
  chunkCount: number
}

export type OntologyDegree = {
  total: number
  incoming: number
  outgoing: number
  byPredicate: Record<string, number>
}

export type SavedViewKind =
  | 'topLevelDomain'
  | 'majorContrast'
  | 'primaryMetaphor'
  | 'organizingOntology'

export type SavedView = {
  id: string
  kind: SavedViewKind
  label: string
  summary: string
  conceptIds: string[]
  relationIds: string[]
  chunkIds: string[]
  confidence: number
  unresolvedCount: number
}

export type OntologyArtifact = {
  schemaVersion: 'ontology-artifact/v1'
  generatedAt: string
  sourceDocument: {
    path: string
    sha256: string
    title: string
  }
  chunks: OntologyChunk[]
  nodes: OntologyNode[]
  edges: OntologyEdge[]
  warnings: string[]
  synthesis?: SynthesisBlock
  strataOrder?: string[]
  shortlist?: string[]
  savedViews?: SavedView[]
}

export type MatrixOntologyChunk = OntologyChunk & {
  ordinal: number
  headingGroup: string
}

export type MatrixOntologyNode = OntologyNode & {
  stratumIndex: number
  narrativePosition: OntologyNarrativePosition | null
  degree: OntologyDegree
  rankScore: number
}

export type MatrixOntologyArtifact = Omit<OntologyArtifact, 'chunks' | 'nodes' | 'shortlist' | 'savedViews' | 'strataOrder'> & {
  chunks: MatrixOntologyChunk[]
  nodes: MatrixOntologyNode[]
  shortlist: string[]
  savedViews: SavedView[]
  strataOrder: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isEvidence(value: unknown): value is OntologyEvidence {
  return (
    isRecord(value) &&
    typeof value.chunkId === 'string' &&
    typeof value.lineStart === 'number' &&
    typeof value.lineEnd === 'number' &&
    typeof value.excerpt === 'string'
  )
}

function isChunk(value: unknown): value is OntologyChunk {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    Array.isArray(value.headingPath) &&
    value.headingPath.every((entry) => typeof entry === 'string') &&
    typeof value.lineStart === 'number' &&
    typeof value.lineEnd === 'number' &&
    typeof value.charCount === 'number' &&
    (value.ordinal === undefined || typeof value.ordinal === 'number') &&
    (value.headingGroup === undefined || typeof value.headingGroup === 'string')
  )
}

function isNarrativePosition(value: unknown): value is OntologyNarrativePosition {
  return (
    isRecord(value) &&
    typeof value.firstChunk === 'string' &&
    typeof value.lastChunk === 'string' &&
    typeof value.meanChunkOrdinal === 'number' &&
    typeof value.spanChunks === 'number' &&
    typeof value.chunkCount === 'number'
  )
}

function isDegree(value: unknown): value is OntologyDegree {
  return (
    isRecord(value) &&
    typeof value.total === 'number' &&
    typeof value.incoming === 'number' &&
    typeof value.outgoing === 'number' &&
    isRecord(value.byPredicate) &&
    Object.values(value.byPredicate).every((entry) => typeof entry === 'number')
  )
}

function isNode(value: unknown): value is OntologyNode {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    typeof value.type === 'string' &&
    Array.isArray(value.aliases) &&
    value.aliases.every((entry) => typeof entry === 'string') &&
    typeof value.summary === 'string' &&
    typeof value.confidence === 'number' &&
    Array.isArray(value.evidence) &&
    value.evidence.every(isEvidence) &&
    (value.stratumIndex === undefined || typeof value.stratumIndex === 'number') &&
    (value.narrativePosition === undefined ||
      value.narrativePosition === null ||
      isNarrativePosition(value.narrativePosition)) &&
    (value.degree === undefined || isDegree(value.degree)) &&
    (value.rankScore === undefined || typeof value.rankScore === 'number')
  )
}

function isEdge(value: unknown): value is OntologyEdge {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.source === 'string' &&
    typeof value.target === 'string' &&
    typeof value.predicate === 'string' &&
    typeof value.summary === 'string' &&
    typeof value.confidence === 'number' &&
    Array.isArray(value.evidence) &&
    value.evidence.every(isEvidence)
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isSynthesisTheme(value: unknown): value is SynthesisTheme {
  return (
    isRecord(value) &&
    typeof value.label === 'string' &&
    typeof value.summary === 'string' &&
    isStringArray(value.conceptIds) &&
    isStringArray(value.relationIds) &&
    typeof value.confidence === 'number'
  )
}

function isSynthesisBlock(value: unknown): value is SynthesisBlock {
  return (
    isRecord(value) &&
    Array.isArray(value.topLevelDomains) &&
    value.topLevelDomains.every(isSynthesisTheme) &&
    Array.isArray(value.majorContrasts) &&
    value.majorContrasts.every(isSynthesisTheme) &&
    Array.isArray(value.primaryMetaphors) &&
    value.primaryMetaphors.every(isSynthesisTheme)
  )
}

function isSavedView(value: unknown): value is SavedView {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.kind === 'string' &&
    typeof value.label === 'string' &&
    typeof value.summary === 'string' &&
    isStringArray(value.conceptIds) &&
    isStringArray(value.relationIds) &&
    isStringArray(value.chunkIds) &&
    typeof value.confidence === 'number' &&
    typeof value.unresolvedCount === 'number'
  )
}

export function isOntologyArtifact(value: unknown): value is OntologyArtifact {
  if (!isRecord(value)) {
    return false
  }

  const synthesisOk = value.synthesis === undefined || isSynthesisBlock(value.synthesis)
  const strataOrderOk = value.strataOrder === undefined || isStringArray(value.strataOrder)
  const shortlistOk = value.shortlist === undefined || isStringArray(value.shortlist)
  const savedViewsOk = value.savedViews === undefined || (Array.isArray(value.savedViews) && value.savedViews.every(isSavedView))

  return (
    value.schemaVersion === 'ontology-artifact/v1' &&
    isRecord(value.sourceDocument) &&
    typeof value.generatedAt === 'string' &&
    typeof value.sourceDocument.path === 'string' &&
    typeof value.sourceDocument.sha256 === 'string' &&
    typeof value.sourceDocument.title === 'string' &&
    Array.isArray(value.chunks) &&
    value.chunks.every(isChunk) &&
    Array.isArray(value.nodes) &&
    value.nodes.every(isNode) &&
    Array.isArray(value.edges) &&
    value.edges.every(isEdge) &&
    Array.isArray(value.warnings) &&
    value.warnings.every((entry) => typeof entry === 'string') &&
    synthesisOk &&
    strataOrderOk &&
    shortlistOk &&
    savedViewsOk
  )
}

export function isMatrixArtifact(value: unknown): value is MatrixOntologyArtifact {
  if (!isOntologyArtifact(value)) {
    return false
  }

  return (
    Array.isArray(value.strataOrder) &&
    Array.isArray(value.shortlist) &&
    Array.isArray(value.savedViews) &&
    value.chunks.every(
      (chunk) => typeof chunk.ordinal === 'number' && typeof chunk.headingGroup === 'string',
    ) &&
    value.nodes.every(
      (node) =>
        typeof node.stratumIndex === 'number' &&
        'narrativePosition' in node &&
        (node.narrativePosition === null || isNarrativePosition(node.narrativePosition)) &&
        isDegree(node.degree) &&
        typeof node.rankScore === 'number',
    )
  )
}
