import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { randomUUID } from 'crypto'
import { centroid, embedTexts, termSetKey, vectorNorm } from './shared/embedding'
import { writeActiveBoard } from './shared/dynamo'
import type { BoardRecord, GeneratedBoard, StoredCategory } from './shared/types'
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

async function generateBoard(apiKey: string, model: string) {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      messages: [
        {
          role: 'system',
          content: 'Generate strict JSON for a 4x4 NYT Connections-style word game. Return JSON only.',
        },
        {
          role: 'user',
          content: [
            'Create exactly four semantic categories with exactly four short display terms each.',
            'Use difficultyIndex 0, 1, 2, and 3 exactly once, easiest to hardest.',
            'All 16 terms must be globally unique case-insensitively.',
            'Avoid categories that can be solved by the same surface feature unless that is the intended connection.',
            'Avoid terms that naturally fit multiple categories on the same board.',
            'Write one short explanation sentence for each category.',
          ].join(' '),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'xand1_board',
          strict: true,
          schema: {
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
                  required: ['title', 'difficultyIndex', 'terms', 'explanation'],
                  properties: {
                    title: { type: 'string' },
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
          },
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

  return validateGeneratedBoard(JSON.parse(content))
}

function buildStoredCategories(board: GeneratedBoard, embeddings: number[][]) {
  const categories: StoredCategory[] = []
  let offset = 0

  for (const category of board.categories) {
    const termEmbeddings = embeddings.slice(offset, offset + category.terms.length)
    offset += category.terms.length
    const center = centroid(termEmbeddings)

    categories.push({
      categoryId: randomUUID(),
      title: category.title,
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

export async function handler() {
  const tableName = requiredEnv('TABLE_NAME')
  const embeddingModel = requiredEnv('BEDROCK_MODEL_ID')
  const openAiModel = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini'
  const promptVersion = process.env.GENERATION_PROMPT_VERSION ?? '2026-06-11'

  const apiKey = await getOpenAiApiKey()
  const generatedBoard = await generateBoard(apiKey, openAiModel)
  const allTerms = generatedBoard.categories.flatMap((category) => category.terms)
  const embeddings = await embedTexts(bedrock, embeddingModel, allTerms, 'search_document')
  const createdAt = new Date().toISOString()
  const boardId = randomUUID()

  const boardRecord: BoardRecord = {
    pk: `BOARD#${boardId}`,
    sk: 'META',
    boardId,
    createdAt,
    status: 'active',
    model: openAiModel,
    embeddingModel,
    terms: shuffled(allTerms),
    categories: buildStoredCategories(generatedBoard, embeddings),
    generationPromptVersion: promptVersion,
    rawGeneration: generatedBoard,
  }

  await writeActiveBoard(tableName, boardRecord, createdAt)

  return {
    boardId,
    terms: boardRecord.terms.length,
    categories: boardRecord.categories.map((category) => ({
      title: category.title,
      difficultyIndex: category.difficultyIndex,
    })),
  }
}
