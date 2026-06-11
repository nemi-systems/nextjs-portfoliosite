import { describe, expect, it } from 'vitest'
import { calculateScoreSummary, modelAbbreviation, normalizeTerm, sameTermSet, splitTermForMobile, termSetKey, wordmarkToneForToken } from './game'

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
    expect(splitTermForMobile('Oregano')).toEqual(['Oreg', 'ano'])
    expect(splitTermForMobile('Handlebar')).toEqual(['Handl', 'ebar'])
    expect(splitTermForMobile('Arabesque')).toEqual(['Arabe', 'sque'])
    expect(splitTermForMobile('electromagnetic')).toEqual(['elect', 'romag', 'netic'])
    expect(splitTermForMobile('coffee-table-book')).toEqual(['coffee', 'table', 'book'])
  })

  it('abbreviates generation model names for board labels', () => {
    expect(modelAbbreviation('gpt-5.5', 'openai')).toBe('5.5')
    expect(modelAbbreviation('claude-fable-20260611', 'anthropic')).toBe('fable')
    expect(modelAbbreviation('vendor/model-family-20260611')).toBe('family')
  })


  it('maps lost lives to progressive x&1 wordmark colors', () => {
    expect([0, 1, 2].map((index) => wordmarkToneForToken(index, 0, false))).toEqual(['black', 'black', 'black'])
    expect([0, 1, 2].map((index) => wordmarkToneForToken(index, 1, false))).toEqual(['red', 'black', 'black'])
    expect([0, 1, 2].map((index) => wordmarkToneForToken(index, 2, false))).toEqual(['red', 'red', 'black'])
    expect([0, 1, 2].map((index) => wordmarkToneForToken(index, 3, false))).toEqual(['red', 'red', 'red'])
    expect([0, 1, 2].map((index) => wordmarkToneForToken(index, 3, true))).toEqual(['outline', 'outline', 'outline'])
  })
  it('doubles semantic match percentages and caps each category at 100%', () => {
    const summary = calculateScoreSummary([
      { title: 'Herbs', difficultyIndex: 0, score: 0.58, solveOrder: 0 },
      { title: 'Bicycle parts', difficultyIndex: 1, score: 0.4, solveOrder: 1 },
      { title: 'Ballet terms', difficultyIndex: 2, score: 0.43, solveOrder: 2 },
      { title: 'Following sleeping', difficultyIndex: 3, score: 0.44, solveOrder: 3 },
    ], 0, 0, 0)

    expect(summary.semanticPercent).toBe(87)
    expect(summary.semanticRows).toEqual([
      { title: 'Herbs', difficultyIndex: 0, weight: 1, rawPercent: 100, weightedContribution: 10 },
      { title: 'Bicycle parts', difficultyIndex: 1, weight: 2, rawPercent: 80, weightedContribution: 16 },
      { title: 'Ballet terms', difficultyIndex: 2, weight: 3, rawPercent: 86, weightedContribution: 26 },
      { title: 'Following sleeping', difficultyIndex: 3, weight: 4, rawPercent: 88, weightedContribution: 35 },
    ])
    expect(summary.perfectOrderBonus).toBe(5)
    expect(summary.finalScore).toBe(92)
    expect(summary.rank).toBe('S')
  })

  it('scores semantics with penalties and capped survival bonuses', () => {
    const summary = calculateScoreSummary([
      { title: 'Easy', difficultyIndex: 0, score: 0.5, solveOrder: 0 },
      { title: 'Medium', difficultyIndex: 1, score: 0.45, solveOrder: 1 },
      { title: 'Hard', difficultyIndex: 2, score: 0.4, solveOrder: 2 },
      { title: 'Tricky', difficultyIndex: 3, score: 0.35, solveOrder: 3 },
    ], 1, 3, 3)

    expect(summary.semanticPercent).toBe(80)
    expect(summary.semanticRows).toEqual([
      { title: 'Easy', difficultyIndex: 0, weight: 1, rawPercent: 100, weightedContribution: 10 },
      { title: 'Medium', difficultyIndex: 1, weight: 2, rawPercent: 90, weightedContribution: 18 },
      { title: 'Hard', difficultyIndex: 2, weight: 3, rawPercent: 80, weightedContribution: 24 },
      { title: 'Tricky', difficultyIndex: 3, weight: 4, rawPercent: 70, weightedContribution: 28 },
    ])
    expect(summary.mistakePenalty).toBe(5)
    expect(summary.coinSurvivalBonus).toBe(6)
    expect(summary.perfectOrderBonus).toBe(0)
    expect(summary.finalScore).toBe(81)
    expect(summary.rank).toBe('A')
  })

  it('uses C for scores below B', () => {
    const summary = calculateScoreSummary([
      { title: 'Easy', difficultyIndex: 0, score: 0.2, solveOrder: 0 },
      { title: 'Medium', difficultyIndex: 1, score: 0.2, solveOrder: 1 },
      { title: 'Hard', difficultyIndex: 2, score: 0.2, solveOrder: 2 },
      { title: 'Tricky', difficultyIndex: 3, score: 0.2, solveOrder: 3 },
    ], 0, 0, 1)

    expect(summary.finalScore).toBe(40)
    expect(summary.rank).toBe('C')
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
