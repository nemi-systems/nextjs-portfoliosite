import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { cosineSimilarity, embedTexts, normalizeTerm, termSetKey } from './shared/embedding'
import { getActiveBoard, getBoardRecord } from './shared/dynamo'
import type { BoardMode, BoardRecord, BoardResponse, GuessRequest, GuessResponse, StoredCategory } from './shared/types'

type HttpEvent = {
  rawPath?: string
  body?: string
  rawQueryString?: string
  queryStringParameters?: Record<string, string | undefined>
  isBase64Encoded?: boolean
  requestContext?: {
    http?: {
      method?: string
      path?: string
    }
  }
}

type HttpResponse = {
  statusCode: number
  headers: Record<string, string>
  body: string
}

const bedrock = new BedrockRuntimeClient({})

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function json(statusCode: number, body: unknown): HttpResponse {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}

function publicBoard(board: BoardRecord): BoardResponse {
  return {
    boardId: board.boardId,
    mode: board.mode,
    terms: board.terms,
    difficultyColors: [...board.categories]
      .sort((left, right) => left.difficultyIndex - right.difficultyIndex)
      .map((category) => category.difficultyColor),
  }
}

function parseBoardMode(value: string | undefined): BoardMode {
  if (!value || value === 'english') {
    return 'english'
  }
  if (value === 'emoji') {
    return 'emoji'
  }
  throw new Error('mode must be english or emoji.')
}

function boardModeFromEvent(event: HttpEvent) {
  const direct = event.queryStringParameters?.mode
  if (direct !== undefined) {
    return parseBoardMode(direct)
  }
  const params = new URLSearchParams(event.rawQueryString ?? '')
  return parseBoardMode(params.get('mode') ?? undefined)
}

function parseBody(event: HttpEvent) {
  if (!event.body) {
    throw new Error('Missing request body.')
  }
  if (event.body.length > 4096) {
    throw new Error('Request body is too large.')
  }

  const decoded = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body
  return JSON.parse(decoded) as unknown
}

function parseGuessRequest(value: unknown): GuessRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Guess request must be an object.')
  }

  const candidate = value as Record<string, unknown>
  const boardId = candidate.boardId
  const terms = candidate.terms
  const label = candidate.label

  if (typeof boardId !== 'string' || !boardId.trim()) {
    throw new Error('boardId is required.')
  }
  if (!Array.isArray(terms) || terms.length !== 4 || terms.some((term) => typeof term !== 'string' || !term.trim())) {
    throw new Error('Exactly four non-empty terms are required.')
  }
  if (typeof label !== 'string' || !label.trim()) {
    throw new Error('label is required.')
  }
  if (label.length > 80) {
    throw new Error('label must be 80 characters or fewer.')
  }

  return {
    boardId: boardId.trim(),
    terms: terms.map((term) => term.trim().replace(/\s+/g, ' ')),
    label: label.trim().replace(/\s+/g, ' '),
  }
}

function selectedTermKeys(board: BoardRecord, selectedTerms: readonly string[]) {
  const boardTerms = new Set(board.terms.map(normalizeTerm))
  const selectedKeys = selectedTerms.map(normalizeTerm)
  if (new Set(selectedKeys).size !== 4 || selectedKeys.some((term) => !boardTerms.has(term))) {
    return undefined
  }
  return selectedKeys
}

function findMatchedCategory(board: BoardRecord, selectedTerms: readonly string[]) {
  const selectedKeys = selectedTermKeys(board, selectedTerms)
  if (!selectedKeys) {
    return undefined
  }

  const selectedKey = termSetKey(selectedTerms)
  return board.categories.find((category) => category.termSetKey === selectedKey)
}

function isOneAway(board: BoardRecord, selectedTerms: readonly string[]) {
  const selectedKeys = selectedTermKeys(board, selectedTerms)
  if (!selectedKeys) {
    return false
  }
  const selectedSet = new Set(selectedKeys)
  return board.categories.some((category) => category.terms.filter((term) => selectedSet.has(normalizeTerm(term))).length === 3)
}

function solvedResponse(category: StoredCategory, score: number, threshold: number, guessedLabel: string): GuessResponse {
  return {
    status: 'solved',
    category: {
      title: category.title,
      color: category.difficultyColor,
      difficultyIndex: category.difficultyIndex,
      terms: category.terms,
      ...(category.explanation ? { explanation: category.explanation } : {}),
    },
    guessedLabel,
    score,
    threshold,
    passedThreshold: score >= threshold,
  }
}

async function handleGetBoard(event: HttpEvent) {
  const tableName = requiredEnv('TABLE_NAME')
  const mode = boardModeFromEvent(event)
  const board = await getActiveBoard(tableName, mode)
  if (!board) {
    return json(404, { message: 'No active xand1 board is available.' })
  }
  return json(200, publicBoard(board))
}

async function handleGuess(event: HttpEvent) {
  const tableName = requiredEnv('TABLE_NAME')
  const modelId = requiredEnv('BEDROCK_MODEL_ID')
  const threshold = Number.parseFloat(process.env.CATEGORY_LABEL_THRESHOLD ?? '0.35')
  if (!Number.isFinite(threshold)) {
    throw new Error('CATEGORY_LABEL_THRESHOLD must be a number.')
  }

  const request = parseGuessRequest(parseBody(event))
  const board = await getBoardRecord(tableName, request.boardId)
  if (!board) {
    return json(404, { message: 'Board not found.' })
  }

  const matchedCategory = findMatchedCategory(board, request.terms)
  if (!matchedCategory) {
    return json(200, {
      status: 'wrong_terms',
      message: 'Not quite.',
      oneAway: isOneAway(board, request.terms),
    } satisfies GuessResponse)
  }

  const [labelEmbedding] = await embedTexts(bedrock, modelId, [request.label], 'search_query')
  const score = cosineSimilarity(labelEmbedding, matchedCategory.centroid, matchedCategory.centroidNorm)

  return json(200, solvedResponse(matchedCategory, score, threshold, request.label))
}

async function handleWarm() {
  return json(200, { ok: true })
}

export async function handler(event: HttpEvent) {
  try {
    const method = event.requestContext?.http?.method
    const path = event.rawPath ?? event.requestContext?.http?.path ?? ''

    if (method === 'GET' && path.endsWith('/board')) {
      return await handleGetBoard(event)
    }
    if (method === 'GET' && path.endsWith('/warm')) {
      return await handleWarm()
    }
    if (method === 'POST' && path.endsWith('/guess')) {
      return await handleGuess(event)
    }

    return json(404, { message: 'Not found.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected xand1 API error.'
    const statusCode = message.includes('required') || message.includes('Request body') || message.includes('Guess request') || message.includes('label must') || message.includes('mode must')
      ? 400
      : 500
    return json(statusCode, { message })
  }
}
