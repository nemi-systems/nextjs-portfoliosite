export type BoardMode = 'english' | 'emoji'

export type GenerationProvider = 'openai' | 'anthropic'


export type BoardResponse = {
  boardId: string
  mode: BoardMode
  terms: string[]
  difficultyColors: string[]
}

export type BoardSummary = {
  boardId: string
  mode: BoardMode
  createdAt: string
  model: string
  provider: GenerationProvider
  isActive: boolean
}

export type BoardListResponse = {
  boards: BoardSummary[]
}

export type GuessRequest = {
  boardId: string
  terms: string[]
  label: string
}

export type SolvedGuessResponse = {
  status: 'solved'
  category: {
    title: string
    color: string
    difficultyIndex: number
    terms: string[]
    explanation?: string
  }
  guessedLabel: string
  score: number
  threshold: number
  passedThreshold: boolean
}

export type WrongTermsGuessResponse = {
  status: 'wrong_terms'
  message: string
  oneAway: boolean
}

export type GuessResponse = SolvedGuessResponse | WrongTermsGuessResponse
