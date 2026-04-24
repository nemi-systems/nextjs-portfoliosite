import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const defaultSource = path.resolve(
  projectRoot,
  '../../../ontology-builder/artifacts/runs/vM1/publish/current.json',
)
const manifestPath = path.resolve(projectRoot, 'public/data/manifest.json')

function toSlug(title) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function parseArgs(argv) {
  const args = { source: defaultSource, slug: '' }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]

    if (current === '--source' && next) {
      args.source = path.resolve(projectRoot, next)
      index += 1
      continue
    }

    if (current === '--slug' && next) {
      args.slug = next
      index += 1
      continue
    }
  }

  return args
}

function inferRunSlug(source) {
  const match = source.match(/artifacts\/runs\/([^/]+)\/publish\/current\.json$/)
  return match ? match[1] : ''
}

function isObject(value) {
  return typeof value === 'object' && value !== null
}

function isValidArtifact(value) {
  return (
    isObject(value) &&
    value.schemaVersion === 'ontology-artifact/v1' &&
    isObject(value.sourceDocument) &&
    typeof value.sourceDocument.title === 'string' &&
    Array.isArray(value.chunks) &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges) &&
    Array.isArray(value.warnings)
  )
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isMatrixCompatibleArtifact(value) {
  return (
    isValidArtifact(value) &&
    isStringArray(value.strataOrder) &&
    isStringArray(value.shortlist) &&
    Array.isArray(value.savedViews) &&
    value.chunks.every(
      (chunk) => typeof chunk.ordinal === 'number' && typeof chunk.headingGroup === 'string',
    ) &&
    value.nodes.every(
      (node) =>
        typeof node.stratumIndex === 'number' &&
        Object.prototype.hasOwnProperty.call(node, 'narrativePosition') &&
        (node.narrativePosition === null || isObject(node.narrativePosition)) &&
        isObject(node.degree) &&
        typeof node.rankScore === 'number',
    )
  )
}

async function loadManifest() {
  try {
    const raw = await fs.readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(raw)
    if (manifest.schemaVersion === 'ontology-manifest/v1' && Array.isArray(manifest.graphs)) {
      return manifest
    }
  } catch {
    // File doesn't exist or is invalid — start fresh
  }

  return { schemaVersion: 'ontology-manifest/v1', graphs: [] }
}

async function main() {
  const { source, slug: explicitSlug } = parseArgs(process.argv.slice(2))
  const raw = await fs.readFile(source, 'utf8')
  const artifact = JSON.parse(raw)

  if (!isValidArtifact(artifact)) {
    throw new Error(`Invalid ontology artifact at ${source}`)
  }

  const slug = explicitSlug || inferRunSlug(source) || toSlug(artifact.sourceDocument.title)
  const destination = path.resolve(projectRoot, `public/data/${slug}.json`)

  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.writeFile(destination, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')

  // Update manifest
  const manifest = await loadManifest()
  const existingIndex = manifest.graphs.findIndex((entry) => entry.slug === slug)
  const entry = {
    slug,
    title: artifact.sourceDocument.title,
    path: `/data/${slug}.json`,
    matrixCompatible: isMatrixCompatibleArtifact(artifact),
  }

  if (existingIndex >= 0) {
    manifest.graphs[existingIndex] = entry
  } else {
    manifest.graphs.push(entry)
  }

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  console.log(
    [
      'Imported ontology artifact',
      `source: ${source}`,
      `destination: ${destination}`,
      `slug: ${slug}`,
      `title: ${artifact.sourceDocument.title}`,
      `nodes: ${artifact.nodes.length}`,
      `edges: ${artifact.edges.length}`,
      `chunks: ${artifact.chunks.length}`,
      `warnings: ${artifact.warnings.length}`,
    ].join('\n'),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
