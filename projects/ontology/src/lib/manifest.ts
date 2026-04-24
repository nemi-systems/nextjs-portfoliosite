export type GraphManifestEntry = {
  slug: string
  title: string
  path: string
  description?: string
  matrixCompatible?: boolean
}

export type GraphManifest = {
  schemaVersion: 'ontology-manifest/v1'
  graphs: GraphManifestEntry[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isGraphManifest(value: unknown): value is GraphManifest {
  if (!isObject(value)) return false
  if (value.schemaVersion !== 'ontology-manifest/v1') return false
  if (!Array.isArray(value.graphs)) return false

  return value.graphs.every(
    (entry: unknown) =>
      isObject(entry) &&
      typeof entry.slug === 'string' &&
      typeof entry.title === 'string' &&
      typeof entry.path === 'string' &&
      (entry.description === undefined || typeof entry.description === 'string') &&
      (entry.matrixCompatible === undefined || typeof entry.matrixCompatible === 'boolean'),
  )
}

export function getMatrixCompatibleGraphs(manifest: GraphManifest): GraphManifestEntry[] {
  return manifest.graphs.filter((entry) => entry.matrixCompatible === true)
}
