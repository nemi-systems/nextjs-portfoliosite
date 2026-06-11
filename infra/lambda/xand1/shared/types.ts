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

export type GeneratedCategory = {
  title: string
  alternativeTitles: string[]
  difficultyIndex: number
  terms: string[]
  explanation?: string
}

export type GeneratedBoard = {
  mode: BoardMode
  categories: GeneratedCategory[]
}

export type StoredCategory = {
  categoryId: string
  title: string
  alternativeTitles?: string[]
  difficultyIndex: number
  difficultyColor: string
  terms: string[]
  termSetKey: string
  centroid: number[]
  centroidNorm: number
  explanation?: string
}

export type BoardRecord = {
  pk: string
  sk: 'META'
  boardId: string
  mode: BoardMode
  createdAt: string
  status: 'active' | 'archived'
  model: string
  embeddingModel: string
  terms: string[]
  categories: StoredCategory[]
  generationPromptVersion: string
  rawGeneration?: GeneratedBoard
}

export type ActiveBoardRecord = {
  pk: 'ACTIVE'
  sk: `BOARD#${BoardMode}` | 'BOARD'
  boardId: string
  updatedAt: string
}
