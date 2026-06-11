export const DIFFICULTY_COLORS = ['#352A87', '#0F5CDD', '#00A6A6', '#F9D423'] as const

export const DIFFICULTY_WEIGHTS = [1, 2, 3, 4] as const
export const MISTAKE_PENALTY = 5
export const COIN_SURVIVAL_BONUS = 3
export const MAX_COIN_SURVIVAL_BONUS = 6
export const PERFECT_ORDER_BONUS = 5
export const RANK_THRESHOLDS = { s: 90, a: 70, b: 50 } as const

export type WordmarkTone = 'black' | 'red' | 'outline'

export function wordmarkToneForToken(tokenIndex: number, livesLost: number, outlined: boolean): WordmarkTone {
  if (outlined) {
    return 'outline'
  }

  return tokenIndex < livesLost ? 'red' : 'black'
}

export type ScoreCategoryInput = {
  title: string
  difficultyIndex: number
  score: number
  solveOrder: number
}

export type SemanticScoreRow = {
  title: string
  difficultyIndex: number
  weight: number
  rawPercent: number
  weightedContribution: number
}

export type ScoreSummary = {
  semanticRows: SemanticScoreRow[]
  semanticPercent: number
  mistakePenalty: number
  coinSurvivalBonus: number
  perfectOrderBonus: number
  finalScore: number
  rank: 'S' | 'A' | 'B' | 'C'
}

export function normalizeTerm(term: string) {
  return term.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

export function termSetKey(terms: readonly string[]) {
  return terms.map(normalizeTerm).sort().join('||')
}

export function sameTermSet(left: readonly string[], right: readonly string[]) {
  return termSetKey(left) === termSetKey(right)
}

function clampScore(score: number) {
  if (score < 0) {
    return 0
  }
  if (score > 100) {
    return 100
  }
  return score
}

function semanticMatchScore(score: number) {
  return Math.min(Math.max(score * 2, 0), 1)
}

export function isPerfectSolveOrder(categories: readonly ScoreCategoryInput[], wrongGuesses: number, coinFlips: number) {
  if (categories.length !== 4 || wrongGuesses !== 0 || coinFlips !== 0) {
    return false
  }

  return [...categories]
    .sort((left, right) => left.solveOrder - right.solveOrder)
    .every((category, index) => category.difficultyIndex === index)
}

export function calculateScoreSummary(
  categories: readonly ScoreCategoryInput[],
  wrongGuesses: number,
  coinSurvivalWins: number,
  coinFlips: number,
): ScoreSummary {
  const totalWeight = categories.reduce((total, category) => total + (DIFFICULTY_WEIGHTS[category.difficultyIndex] ?? 0), 0)
  const semanticRows = categories.map((category) => {
    const score = semanticMatchScore(category.score)
    const weight = DIFFICULTY_WEIGHTS[category.difficultyIndex] ?? 0
    return {
      title: category.title,
      difficultyIndex: category.difficultyIndex,
      weight,
      rawPercent: Math.round(score * 100),
      weightedContribution: totalWeight === 0 ? 0 : Math.round(((score * weight) / totalWeight) * 100),
    }
  })
  const weightedTotal = categories.reduce((total, category) => {
    const weight = DIFFICULTY_WEIGHTS[category.difficultyIndex] ?? 0
    return total + semanticMatchScore(category.score) * weight
  }, 0)
  const semanticPercent = totalWeight === 0 ? 0 : Math.round((weightedTotal / totalWeight) * 100)
  const mistakePenalty = wrongGuesses * MISTAKE_PENALTY
  const coinSurvivalBonus = Math.min(coinSurvivalWins * COIN_SURVIVAL_BONUS, MAX_COIN_SURVIVAL_BONUS)
  const perfectOrderBonus = isPerfectSolveOrder(categories, wrongGuesses, coinFlips) ? PERFECT_ORDER_BONUS : 0
  const finalScore = Math.round(clampScore(semanticPercent - mistakePenalty + coinSurvivalBonus + perfectOrderBonus))
  const rank = finalScore >= RANK_THRESHOLDS.s ? 'S' : finalScore >= RANK_THRESHOLDS.a ? 'A' : finalScore >= RANK_THRESHOLDS.b ? 'B' : 'C'

  return {
    semanticRows,
    semanticPercent,
    mistakePenalty,
    coinSurvivalBonus,
    perfectOrderBonus,
    finalScore,
    rank,
  }
}

function splitOnDelimiterNearMiddle(term: string) {
  const midpoint = term.length / 2
  let bestIndex = -1
  let bestDistance = Number.POSITIVE_INFINITY

  for (let index = 1; index < term.length - 1; index += 1) {
    const char = term[index]
    if (char !== ' ' && char !== '-' && char !== '/') {
      continue
    }
    const distance = Math.abs(index - midpoint)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }

  if (bestIndex === -1) {
    return undefined
  }

  const left = term.slice(0, bestIndex).trim()
  const right = term.slice(bestIndex + 1).trim()
  return left && right ? [left, right] : undefined
}

const MAX_MOBILE_TERM_CHARS_PER_LINE = 6

function splitSingleLongWord(term: string) {
  const chunkCount = Math.ceil(term.length / MAX_MOBILE_TERM_CHARS_PER_LINE)
  const chunkLength = Math.ceil(term.length / chunkCount)
  const chunks: string[] = []

  for (let index = 0; index < term.length; index += chunkLength) {
    chunks.push(term.slice(index, index + chunkLength))
  }

  return chunks
}

function splitLongMobileChunk(term: string): string[] {
  const delimiterSplit = splitOnDelimiterNearMiddle(term)
  if (delimiterSplit) {
    return delimiterSplit.flatMap((chunk) => (
      chunk.length <= MAX_MOBILE_TERM_CHARS_PER_LINE ? [chunk] : splitLongMobileChunk(chunk)
    ))
  }

  return splitSingleLongWord(term)
}

export function splitTermForMobile(term: string) {
  const clean = term.trim().replace(/\s+/g, ' ')
  if (clean.length <= MAX_MOBILE_TERM_CHARS_PER_LINE) {
    return [clean]
  }

  const delimiterSplit = splitOnDelimiterNearMiddle(clean)
  if (delimiterSplit && clean.length > 12) {
    return delimiterSplit.flatMap((chunk) => (
      chunk.length <= MAX_MOBILE_TERM_CHARS_PER_LINE ? [chunk] : splitLongMobileChunk(chunk)
    ))
  }

  return delimiterSplit ? [clean] : splitLongMobileChunk(clean)
}

export function shuffledTerms<T>(values: readonly T[]) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }
  return result
}
