import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { randomUUID } from 'crypto'
import { centroid, embedTexts, termSetKey, vectorNorm } from './shared/embedding'
import { writeActiveBoard } from './shared/dynamo'
import type { BoardMode, BoardRecord, GeneratedBoard, GenerationProvider, StoredCategory } from './shared/types'
import { DIFFICULTY_COLORS, shuffled, validateGeneratedBoard } from './shared/validation'

const bedrock = new BedrockRuntimeClient({})
const secrets = new SecretsManagerClient({})

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'


type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

type AnthropicMessageResponse = {
  content?: Array<{
    type?: string
    text?: string
  }>
}

type RefreshEvent = {
  mode: BoardMode
  provider?: GenerationProvider
  model?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseBoardMode(value: unknown): BoardMode {
  if (value === undefined || value === null || value === '' || value === 'english') {
    return 'english'
  }
  if (value === 'emoji') {
    return 'emoji'
  }
  throw new Error('mode must be english or emoji.')
}

function parseGenerationProvider(value: unknown): GenerationProvider | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (value === 'openai' || value === 'anthropic') {
    return value
  }
  throw new Error('provider must be openai or anthropic.')
}

function parseOptionalString(value: unknown, name: string) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  throw new Error(`${name} must be a non-empty string when provided.`)
}

function parseRefreshEvent(event: unknown): RefreshEvent {
  if (event === undefined || event === null) {
    return { mode: 'english' }
  }
  if (!isRecord(event)) {
    throw new Error('Refresh event must be an object when provided.')
  }
  return {
    mode: parseBoardMode(event.mode),
    provider: parseGenerationProvider(event.provider),
    model: parseOptionalString(event.model, 'model'),
  }
}

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function secretStringValue(secretString: string, keys: readonly string[]) {
  try {
    const parsed = JSON.parse(secretString) as Record<string, unknown>
    for (const keyName of keys) {
      const key = parsed[keyName]
      if (typeof key === 'string' && key.trim()) {
        return key.trim()
      }
    }
  } catch {
    // Plain secret strings are supported below.
  }

  const trimmed = secretString.trim()
  if (!trimmed) {
    throw new Error('API key secret string is empty.')
  }
  return trimmed
}

async function secretApiKey(secretArn: string, keys: readonly string[], label: string) {
  const response = await secrets.send(new GetSecretValueCommand({ SecretId: secretArn }))
  const secretString = response.SecretString
  if (!secretString) {
    throw new Error(`${label} API key secret has no string value.`)
  }
  return secretStringValue(secretString, keys)
}

async function getOpenAiApiKey() {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY
  }

  const secretArn = process.env.OPENAI_API_KEY_SECRET_ARN
  if (!secretArn) {
    throw new Error('OPENAI_API_KEY_SECRET_ARN or OPENAI_API_KEY is required to refresh an OpenAI board.')
  }

  return secretApiKey(secretArn, ['OPENAI_API_KEY', 'openaiApiKey', 'apiKey'], 'OpenAI')
}

async function getAnthropicApiKey() {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY
  }

  const secretArn = process.env.ANTHROPIC_API_KEY_SECRET_ARN
  if (!secretArn) {
    throw new Error('ANTHROPIC_API_KEY_SECRET_ARN or ANTHROPIC_API_KEY is required to refresh an Anthropic board.')
  }

  return secretApiKey(secretArn, ['ANTHROPIC_API_KEY', 'anthropicApiKey', 'apiKey'], 'Anthropic')
}

function boardPrompt(mode: BoardMode) {
  if (mode === 'emoji') {
    return {
      system: 'Generate strict JSON for a 4x4 NYT Connections-style emoji game. Return JSON only.',
      user: [
        'Create exactly four semantic categories with exactly four displayed emoji terms each.',
        'Every displayed term must be an emoji or tightly coupled emoji sequence; do not use alphabetic words in terms.',
        'Use normal English for category titles, alternativeTitles, and explanations so semantic scoring remains text-based.',
        'For each category, provide a concise title plus 4-8 concise alternativeTitles that are also correct names for the same four emoji terms.',
        'Use difficultyIndex 0, 1, 2, and 3 exactly once, easiest to hardest.',
        'All 16 emoji terms must be globally unique.',
        'Avoid categories that can be solved only by emoji color, Unicode block, or another surface feature unless that is the intended connection.',
        'Avoid terms that naturally fit multiple categories on the same board.',
        'Write one short English explanation sentence for each category.',
      ].join(' '),
    }
  }

  return {
    system: 'Generate strict JSON for a 4x4 NYT Connections-style word game. Return JSON only.',
    user: [
      'Create exactly four semantic categories with exactly four short display terms each.',
      'For each category, provide a concise title plus 4-8 concise alternativeTitles that are also correct names for the same four terms.',
      'Use difficultyIndex 0, 1, 2, and 3 exactly once, easiest to hardest.',
      'All 16 terms must be globally unique case-insensitively.',
      'Avoid categories that can be solved by the same surface feature unless that is the intended connection.',
      'Avoid terms that naturally fit multiple categories on the same board.',
      'Write one short explanation sentence for each category.',
    ].join(' '),
  }
}

function boardJsonSchema(mode: BoardMode) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['categories'],
    properties: {
      categories: {
        type: 'array',
        minItems: 4,
        maxItems: 4,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'alternativeTitles', 'difficultyIndex', 'terms', 'explanation'],
          properties: {
            title: { type: 'string' },
            alternativeTitles: {
              type: 'array',
              minItems: 4,
              maxItems: 8,
              items: { type: 'string' },
            },
            difficultyIndex: { type: 'integer', minimum: 0, maximum: 3 },
            terms: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string' },
            },
            explanation: { type: 'string' },
          },
        },
      },
    },
  }
}

async function generateOpenAiBoard(apiKey: string, model: string, mode: BoardMode) {
  const prompt = boardPrompt(mode)
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: prompt.system,
        },
        {
          role: 'user',
          content: prompt.user,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: `xand1_${mode}_board`,
          strict: true,
          schema: boardJsonSchema(mode),
        },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI board generation failed with status ${response.status}: ${await response.text()}`)
  }

  const body = (await response.json()) as OpenAiChatResponse
  const content = body.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('OpenAI board generation returned no content.')
  }

  return validateGeneratedBoard(JSON.parse(content), mode)
}

async function generateAnthropicBoard(apiKey: string, model: string, mode: BoardMode) {
  const prompt = boardPrompt(mode)
  const schema = boardJsonSchema(mode)
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: prompt.system,
      messages: [
        {
          role: 'user',
          content: [
            prompt.user,
            'Return only a single JSON object. Do not include markdown fences, commentary, or extra keys.',
            `JSON schema: ${JSON.stringify(schema)}`,
          ].join('\n\n'),
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic board generation failed with status ${response.status}: ${await response.text()}`)
  }

  const body = (await response.json()) as AnthropicMessageResponse
  const content = body.content?.find((part) => part.type === 'text' && part.text)?.text
  if (!content) {
    throw new Error('Anthropic board generation returned no text content.')
  }

  return validateGeneratedBoard(JSON.parse(content), mode)
}

async function generateBoard(provider: GenerationProvider, apiKey: string, model: string, mode: BoardMode) {
  if (provider === 'anthropic') {
    return generateAnthropicBoard(apiKey, model, mode)
  }
  return generateOpenAiBoard(apiKey, model, mode)
}

function buildStoredCategories(board: GeneratedBoard, embeddings: number[][]) {
  const categories: StoredCategory[] = []
  let offset = 0

  for (const category of board.categories) {
    const semanticTargetCount = 1 + category.alternativeTitles.length
    const targetEmbeddings = embeddings.slice(offset, offset + semanticTargetCount)
    offset += semanticTargetCount
    const center = centroid(targetEmbeddings)

    categories.push({
      categoryId: randomUUID(),
      title: category.title,
      alternativeTitles: category.alternativeTitles,
      difficultyIndex: category.difficultyIndex,
      difficultyColor: DIFFICULTY_COLORS[category.difficultyIndex],
      terms: category.terms,
      termSetKey: termSetKey(category.terms),
      centroid: center,
      centroidNorm: vectorNorm(center),
      ...(category.explanation ? { explanation: category.explanation } : {}),
    })
  }

  return categories
}

export async function handler(event?: unknown) {
  const refreshEvent = parseRefreshEvent(event)
  const provider = refreshEvent.provider ?? parseGenerationProvider(process.env.GENERATION_PROVIDER) ?? 'openai'
  const mode = refreshEvent.mode
  const tableName = requiredEnv('TABLE_NAME')
  const embeddingModel = requiredEnv('BEDROCK_MODEL_ID')
  const model = refreshEvent.model ?? (provider === 'anthropic'
    ? requiredEnv('XAND1_ANTHROPIC_MODEL')
    : process.env.OPENAI_MODEL ?? 'gpt-5.5')
  const promptVersion = process.env.GENERATION_PROMPT_VERSION ?? '2026-06-11-mode-aware'

  const apiKey = provider === 'anthropic' ? await getAnthropicApiKey() : await getOpenAiApiKey()
  const generatedBoard = await generateBoard(provider, apiKey, model, mode)
  const allTerms = generatedBoard.categories.flatMap((category) => category.terms)
  const semanticTargets = generatedBoard.categories.flatMap((category) => [category.title, ...category.alternativeTitles])
  const embeddings = await embedTexts(bedrock, embeddingModel, semanticTargets, 'search_document')
  const createdAt = new Date().toISOString()
  const boardId = randomUUID()

  const boardRecord: BoardRecord = {
    pk: `BOARD#${boardId}`,
    sk: 'META',
    boardId,
    mode,
    createdAt,
    status: 'active',
    model,
    embeddingModel,
    provider,
    terms: shuffled(allTerms),
    categories: buildStoredCategories(generatedBoard, embeddings),
    generationPromptVersion: `${promptVersion}:${mode}:${provider}`,
    rawGeneration: generatedBoard,
  }

  await writeActiveBoard(tableName, boardRecord, createdAt)

  return {
    boardId,
    mode,
    provider,
    model,
    terms: boardRecord.terms.length,
    categories: boardRecord.categories.map((category) => ({
      title: category.title,
      difficultyIndex: category.difficultyIndex,
    })),
  }
}
