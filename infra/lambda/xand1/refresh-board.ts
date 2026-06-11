import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { randomUUID } from 'crypto'
import { centroid, embedTexts, termSetKey, vectorNorm } from './shared/embedding'
import { writeActiveBoard } from './shared/dynamo'
import type { BoardMode, BoardRecord, GeneratedBoard, StoredCategory } from './shared/types'
import { DIFFICULTY_COLORS, shuffled, validateGeneratedBoard } from './shared/validation'

const bedrock = new BedrockRuntimeClient({})
const secrets = new SecretsManagerClient({})

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

type RefreshEvent = {
  mode: BoardMode
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

function parseRefreshEvent(event: unknown): RefreshEvent {
  if (event === undefined || event === null) {
    return { mode: 'english' }
  }
  if (!isRecord(event)) {
    throw new Error('Refresh event must be an object when provided.')
  }
  return { mode: parseBoardMode(event.mode) }
}

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

async function getOpenAiApiKey() {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY
  }

  const secretArn = process.env.OPENAI_API_KEY_SECRET_ARN
  if (!secretArn) {
    throw new Error('OPENAI_API_KEY_SECRET_ARN or OPENAI_API_KEY is required to refresh the board.')
  }

  const response = await secrets.send(new GetSecretValueCommand({ SecretId: secretArn }))
  const secretString = response.SecretString
  if (!secretString) {
    throw new Error('OpenAI API key secret has no string value.')
  }

  try {
    const parsed = JSON.parse(secretString) as Record<string, unknown>
    const key = parsed.OPENAI_API_KEY ?? parsed.openaiApiKey ?? parsed.apiKey
    if (typeof key === 'string' && key.trim()) {
      return key
    }
  } catch {
    // Plain secret strings are supported below.
  }

  return secretString.trim()
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

async function generateBoard(apiKey: string, model: string, mode: BoardMode) {
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
  const { mode } = parseRefreshEvent(event)
  const tableName = requiredEnv('TABLE_NAME')
  const embeddingModel = requiredEnv('BEDROCK_MODEL_ID')
  const openAiModel = process.env.OPENAI_MODEL ?? 'gpt-5.5'
  const promptVersion = process.env.GENERATION_PROMPT_VERSION ?? '2026-06-11-mode-aware'

  const apiKey = await getOpenAiApiKey()
  const generatedBoard = await generateBoard(apiKey, openAiModel, mode)
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
    model: openAiModel,
    embeddingModel,
    terms: shuffled(allTerms),
    categories: buildStoredCategories(generatedBoard, embeddings),
    generationPromptVersion: `${promptVersion}:${mode}`,
    rawGeneration: generatedBoard,
  }

  await writeActiveBoard(tableName, boardRecord, createdAt)

  return {
    boardId,
    mode,
    terms: boardRecord.terms.length,
    categories: boardRecord.categories.map((category) => ({
      title: category.title,
      difficultyIndex: category.difficultyIndex,
    })),
  }
}
