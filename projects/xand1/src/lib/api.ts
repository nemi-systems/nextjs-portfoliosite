import type { BoardResponse, GuessRequest, GuessResponse } from './contracts'

export type {
  BoardResponse,
  GuessRequest,
  GuessResponse,
  SolvedGuessResponse,
  WrongTermsGuessResponse,
} from './contracts'

const apiBaseUrl = process.env.NEXT_PUBLIC_XAND1_API_BASE_URL

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('NEXT_PUBLIC_XAND1_API_BASE_URL is not configured.')
  }

  const response = await fetch(new URL(path, apiBaseUrl), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getBoard() {
  return requestJson<BoardResponse>('/board')
}

export function submitGuess(request: GuessRequest) {
  return requestJson<GuessResponse>('/guess', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function warmApi() {
  return requestJson<{ ok: true }>('/warm')
}
