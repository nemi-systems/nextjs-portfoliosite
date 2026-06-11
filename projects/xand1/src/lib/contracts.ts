export type BoardMode = 'english' | 'emoji'

export type BoardResponse = {
  boardId: string
  mode: BoardMode
  terms: string[]
  difficultyColors: string[]
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
