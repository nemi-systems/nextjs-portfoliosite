import type { GeneratedBoard, GeneratedCategory } from './types'
import { termSetKey } from './embedding'

export const DIFFICULTY_COLORS = ['#352A87', '#0F5CDD', '#00A6A6', '#F9D423'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateGeneratedBoard(value: unknown): GeneratedBoard {
  if (!isRecord(value) || !Array.isArray(value.categories)) {
    throw new Error('Generated board must contain a categories array.')
  }
  if (value.categories.length !== 4) {
    throw new Error('Generated board must contain exactly four categories.')
  }

  const seenTerms = new Set<string>()
  const seenDifficulty = new Set<number>()
  const seenTermSets = new Set<string>()
  const categories: GeneratedCategory[] = []

  for (const categoryValue of value.categories) {
    if (!isRecord(categoryValue)) {
      throw new Error('Each generated category must be an object.')
    }

    const title = typeof categoryValue.title === 'string' ? categoryValue.title.trim() : ''
    const rawDifficultyIndex = categoryValue.difficultyIndex
    const terms = categoryValue.terms
    const explanation = typeof categoryValue.explanation === 'string' ? categoryValue.explanation.trim() : undefined

    if (!title) {
      throw new Error('Generated categories must have non-empty titles.')
    }
    if (typeof rawDifficultyIndex !== 'number' || !Number.isInteger(rawDifficultyIndex) || rawDifficultyIndex < 0 || rawDifficultyIndex > 3) {
      throw new Error('Generated difficulty indices must be integers from 0 through 3.')
    }
    const difficultyIndex = rawDifficultyIndex
    if (!Array.isArray(terms) || terms.length !== 4) {
      throw new Error('Each generated category must contain exactly four terms.')
    }

    seenDifficulty.add(difficultyIndex)

    const cleanTerms = terms.map((term) => {
      if (typeof term !== 'string') {
        throw new Error('Generated terms must be strings.')
      }
      const clean = term.trim().replace(/\s+/g, ' ')
      if (!clean) {
        throw new Error('Generated terms must be non-empty.')
      }
      return clean
    })

    for (const term of cleanTerms) {
      const key = term.toLocaleLowerCase('en-US')
      if (seenTerms.has(key)) {
        throw new Error('Generated terms must be globally unique case-insensitively.')
      }
      seenTerms.add(key)
    }

    const setKey = termSetKey(cleanTerms)
    if (seenTermSets.has(setKey)) {
      throw new Error('Generated category term sets must be unique.')
    }
    seenTermSets.add(setKey)

    categories.push({
      title,
      difficultyIndex,
      terms: cleanTerms,
      ...(explanation ? { explanation } : {}),
    })
  }

  if ([0, 1, 2, 3].some((difficultyIndex) => !seenDifficulty.has(difficultyIndex))) {
    throw new Error('Generated difficulty indices must be exactly 0, 1, 2, and 3.')
  }

  return { categories: categories.sort((a, b) => a.difficultyIndex - b.difficultyIndex) }
}

export function shuffled<T>(values: readonly T[]) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }
  return result
}
