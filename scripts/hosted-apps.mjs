import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const manifestPath = path.join(repoRoot, 'hosted-apps.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const [, , action = 'list', requestedId] = process.argv

function runCommand(command, cwd, extraEnv = {}) {
  console.log(`\n[hosted-apps] ${cwd}$ ${command.join(' ')}`)
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    env: { ...process.env, ...extraEnv },
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

function readJsonSecret(secretId) {
  const result = spawnSync('aws', ['secretsmanager', 'get-secret-value', '--secret-id', secretId, '--query', 'SecretString', '--output', 'text'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    const detail = result.stderr ? `\n${result.stderr.trim()}` : ''
    throw new Error(`Unable to read Secrets Manager secret ${secretId}.${detail}`)
  }

  const secretString = result.stdout.trim()
  if (!secretString || secretString === 'None') {
    throw new Error(`Secrets Manager secret ${secretId} has no SecretString.`)
  }

  try {
    return JSON.parse(secretString)
  } catch (error) {
    throw new Error(`Secrets Manager secret ${secretId} must be a JSON object for hosted app build env injection.`)
  }
}

function buildEnvForSite(site) {
  const keys = site.envSecretKeys ?? []
  if (keys.length === 0) {
    return {}
  }

  const missingKeys = keys.filter((key) => !process.env[key])
  if (missingKeys.length === 0) {
    return {}
  }

  const secretIdEnv = site.envSecretIdEnv
  const secretId = secretIdEnv ? process.env[secretIdEnv] : undefined
  if (!secretId) {
    throw new Error(`Missing ${secretIdEnv} for ${site.id}; set it or export ${missingKeys.join(', ')}.`)
  }

  const secret = readJsonSecret(secretId)
  const env = {}
  for (const key of missingKeys) {
    const value = secret[key]
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Secret ${secretId} does not contain non-empty string key ${key}.`)
    }
    env[key] = value
  }
  return env
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
      runCommand(site.buildCommand, resolveProjectPath(site.projectPath), buildEnvForSite(site))
    }
    break
  }

  default:
    console.error(`Unsupported action: ${action}`)
    process.exit(1)
}
