export type BoardResponse = {
  boardId: string
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
  score: number
  threshold: number
}

export type WrongTermsGuessResponse = {
  status: 'wrong_terms'
  message: string
}

export type LabelRejectedGuessResponse = {
  status: 'label_rejected'
  message: string
  score: number
  threshold: number
}

export type GuessResponse = SolvedGuessResponse | WrongTermsGuessResponse | LabelRejectedGuessResponse
