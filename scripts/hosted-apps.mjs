import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const manifestPath = path.join(repoRoot, 'hosted-apps.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const [, , action = 'list', requestedId] = process.argv

function runCommand(command, cwd) {
  console.log(`\n[hosted-apps] ${cwd}$ ${command.join(' ')}`)
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function getSites() {
  if (!requestedId) {
    return manifest.sites
  }

  const site = manifest.sites.find((candidate) => candidate.id === requestedId)
  if (!site) {
    console.error(`Unknown hosted app id: ${requestedId}`)
    process.exit(1)
  }
  return [site]
}

function uniqueByProjectPath(sites, key) {
  const seen = new Set()
  return sites.filter((site) => {
    const projectKey = `${site.projectPath}:${site[key].join(' ')}`
    if (seen.has(projectKey)) {
      return false
    }
    seen.add(projectKey)
    return true
  })
}

function resolveProjectPath(projectPath) {
  return path.resolve(repoRoot, projectPath)
}

switch (action) {
  case 'list': {
    for (const site of manifest.sites) {
      console.log(`${site.id}\t${site.domainAliases.join(', ')}\t${site.artifactPath}`)
    }
    break
  }

  case 'bootstrap': {
    runCommand(['git', 'submodule', 'update', '--init', '--recursive'], repoRoot)

    for (const site of uniqueByProjectPath(getSites(), 'installCommand')) {
      runCommand(site.installCommand, resolveProjectPath(site.projectPath))
    }
    break
  }

  case 'build': {
    for (const site of uniqueByProjectPath(getSites(), 'buildCommand')) {
      runCommand(site.buildCommand, resolveProjectPath(site.projectPath))
    }
    break
  }

  default:
    console.error(`Unsupported action: ${action}`)
    process.exit(1)
}
