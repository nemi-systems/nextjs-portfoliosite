export const DIFFICULTY_COLORS = ['#352A87', '#0F5CDD', '#00A6A6', '#F9D423'] as const

export const DIFFICULTY_WEIGHTS = [1, 2, 3, 4] as const
export const MISTAKE_PENALTY = 5
export const COIN_SURVIVAL_BONUS = 3
export const MAX_COIN_SURVIVAL_BONUS = 6
export const PERFECT_ORDER_BONUS = 5
export const RANK_THRESHOLDS = { s: 90, a: 70 } as const

export type ScoreCategoryInput = {
  title: string
  difficultyIndex: number
  score: number
  solveOrder: number
}

export type ScoreSummary = {
  semanticPercent: number
  mistakePenalty: number
  coinSurvivalBonus: number
  perfectOrderBonus: number
  finalScore: number
  rank: 'S' | 'A' | 'B'
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
  const weightedTotal = categories.reduce((total, category) => {
    const weight = DIFFICULTY_WEIGHTS[category.difficultyIndex] ?? 0
    return total + category.score * weight
  }, 0)
  const totalWeight = categories.reduce((total, category) => total + (DIFFICULTY_WEIGHTS[category.difficultyIndex] ?? 0), 0)
  const semanticPercent = totalWeight === 0 ? 0 : Math.round((weightedTotal / totalWeight) * 100)
  const mistakePenalty = wrongGuesses * MISTAKE_PENALTY
  const coinSurvivalBonus = Math.min(coinSurvivalWins * COIN_SURVIVAL_BONUS, MAX_COIN_SURVIVAL_BONUS)
  const perfectOrderBonus = isPerfectSolveOrder(categories, wrongGuesses, coinFlips) ? PERFECT_ORDER_BONUS : 0
  const finalScore = Math.round(clampScore(semanticPercent - mistakePenalty + coinSurvivalBonus + perfectOrderBonus))
  const rank = finalScore >= RANK_THRESHOLDS.s ? 'S' : finalScore >= RANK_THRESHOLDS.a ? 'A' : 'B'

  return {
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

function splitSingleLongWord(term: string) {
  const midpoint = Math.floor(term.length / 2)
  const vowels = 'aeiouy'
  let bestIndex = midpoint
  let bestDistance = Number.POSITIVE_INFINITY

  for (let index = 3; index <= term.length - 3; index += 1) {
    const left = term[index - 1]?.toLocaleLowerCase('en-US') ?? ''
    const right = term[index]?.toLocaleLowerCase('en-US') ?? ''
    if (vowels.includes(left) === vowels.includes(right)) {
      continue
    }
    const distance = Math.abs(index - midpoint)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }

  return [term.slice(0, bestIndex), term.slice(bestIndex)]
}

export function splitTermForMobile(term: string) {
  const clean = term.trim().replace(/\s+/g, ' ')
  if (clean.length <= 12) {
    return [clean]
  }

  return splitOnDelimiterNearMiddle(clean) ?? splitSingleLongWord(clean)
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
