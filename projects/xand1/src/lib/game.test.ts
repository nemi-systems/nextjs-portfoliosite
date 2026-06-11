import { describe, expect, it } from 'vitest'
import { calculateScoreSummary, normalizeTerm, sameTermSet, splitTermForMobile, termSetKey } from './game'

describe('game helpers', () => {
  it('normalizes display terms without changing semantic content', () => {
    expect(normalizeTerm('  Black   Hole  ')).toBe('black hole')
  })

  it('builds stable term-set keys independent of order and case', () => {
    expect(termSetKey(['Beta', 'alpha', 'Gamma Ray', 'delta'])).toBe(termSetKey([' delta ', 'GAMMA  RAY', 'ALPHA', 'beta']))
    expect(sameTermSet(['Beta', 'alpha'], ['alpha', 'Beta'])).toBe(true)
    expect(sameTermSet(['Beta', 'alpha'], ['alpha', 'Theta'])).toBe(false)
  })

  it('splits long mobile terms at readable boundaries', () => {
    expect(splitTermForMobile('Solar wind')).toEqual(['Solar wind'])
    expect(splitTermForMobile('electromagnetic')).toEqual(['electro', 'magnetic'])
    expect(splitTermForMobile('coffee-table-book')).toEqual(['coffee', 'table-book'])
  })

  it('scores semantics with penalties and capped survival bonuses', () => {
    const summary = calculateScoreSummary([
      { title: 'Easy', difficultyIndex: 0, score: 1, solveOrder: 0 },
      { title: 'Medium', difficultyIndex: 1, score: 0.9, solveOrder: 1 },
      { title: 'Hard', difficultyIndex: 2, score: 0.8, solveOrder: 2 },
      { title: 'Tricky', difficultyIndex: 3, score: 0.7, solveOrder: 3 },
    ], 1, 3, 3)

    expect(summary.semanticPercent).toBe(80)
    expect(summary.mistakePenalty).toBe(5)
    expect(summary.coinSurvivalBonus).toBe(6)
    expect(summary.perfectOrderBonus).toBe(0)
    expect(summary.finalScore).toBe(81)
    expect(summary.rank).toBe('A')
  })

  it('adds perfect-order bonus only with no mistakes or flips', () => {
    const categories = [
      { title: 'Easy', difficultyIndex: 0, score: 0.9, solveOrder: 0 },
      { title: 'Medium', difficultyIndex: 1, score: 0.9, solveOrder: 1 },
      { title: 'Hard', difficultyIndex: 2, score: 0.9, solveOrder: 2 },
      { title: 'Tricky', difficultyIndex: 3, score: 0.9, solveOrder: 3 },
    ]

    expect(calculateScoreSummary(categories, 0, 0, 0).perfectOrderBonus).toBe(5)
    expect(calculateScoreSummary(categories, 0, 0, 1).perfectOrderBonus).toBe(0)
  })
})
