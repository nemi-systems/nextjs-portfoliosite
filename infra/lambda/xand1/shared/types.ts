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

export type GeneratedCategory = {
  title: string
  difficultyIndex: number
  terms: string[]
  explanation?: string
}

export type GeneratedBoard = {
  categories: GeneratedCategory[]
}

export type StoredCategory = {
  categoryId: string
  title: string
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
  sk: 'BOARD'
  boardId: string
  updatedAt: string
}
