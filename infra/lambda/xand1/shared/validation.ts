import type { BoardMode, GeneratedBoard, GeneratedCategory } from './types'
import { termSetKey } from './embedding'

export const DIFFICULTY_COLORS = ['#352A87', '#0F5CDD', '#00A6A6', '#F9D423'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeTitle(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

const EMOJI_TERM_PATTERN = /[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u20E3]/u
const ASCII_LETTER_PATTERN = /[A-Za-z]/

export function activeBoardSk(mode: BoardMode) {
  return `BOARD#${mode}` as const
}

function hasEmojiPresentation(value: string) {
  return EMOJI_TERM_PATTERN.test(value)
}

function validateTermForMode(term: string, mode: BoardMode) {
  if (mode !== 'emoji') {
    return
  }
  if (!hasEmojiPresentation(term) || ASCII_LETTER_PATTERN.test(term)) {
    throw new Error('Emoji generated terms must be emoji sequences without alphabetic words.')
  }
}

function cleanAlternativeTitles(rawAlternativeTitles: unknown, title: string) {
  if (!Array.isArray(rawAlternativeTitles) || rawAlternativeTitles.length < 4 || rawAlternativeTitles.length > 8) {
    throw new Error('Generated categories must contain four to eight alternativeTitles.')
  }

  const titleKey = title.toLocaleLowerCase('en-US')
  const seen = new Set([titleKey])
  const alternativeTitles: string[] = []

  for (const rawTitle of rawAlternativeTitles) {
    if (typeof rawTitle !== 'string') {
      throw new Error('Generated alternativeTitles must be strings.')
    }
    const clean = normalizeTitle(rawTitle)
    if (!clean) {
      throw new Error('Generated alternativeTitles must be non-empty.')
    }
    const key = clean.toLocaleLowerCase('en-US')
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    alternativeTitles.push(clean)
  }

  if (alternativeTitles.length < 4) {
    throw new Error('Generated categories must contain at least four unique alternativeTitles.')
  }

  return alternativeTitles
}

export function validateGeneratedBoard(value: unknown, mode: BoardMode = 'english'): GeneratedBoard {
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

    const title = typeof categoryValue.title === 'string' ? normalizeTitle(categoryValue.title) : ''
    const rawDifficultyIndex = categoryValue.difficultyIndex
    const terms = categoryValue.terms
    const explanation = typeof categoryValue.explanation === 'string' ? categoryValue.explanation.trim() : undefined

    if (!title) {
      throw new Error('Generated categories must have non-empty titles.')
    }
    const alternativeTitles = cleanAlternativeTitles(categoryValue.alternativeTitles, title)
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
      validateTermForMode(clean, mode)
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
      alternativeTitles,
      difficultyIndex,
      terms: cleanTerms,
      ...(explanation ? { explanation } : {}),
    })
  }

  if ([0, 1, 2, 3].some((difficultyIndex) => !seenDifficulty.has(difficultyIndex))) {
    throw new Error('Generated difficulty indices must be exactly 0, 1, 2, and 3.')
  }

  return { mode, categories: categories.sort((a, b) => a.difficultyIndex - b.difficultyIndex) }
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
