import { describe, expect, it } from 'vitest'
import { normalizeTerm, sameTermSet, termSetKey } from './game'

describe('game helpers', () => {
  it('normalizes display terms without changing semantic content', () => {
    expect(normalizeTerm('  Black   Hole  ')).toBe('black hole')
  })

  it('builds stable term-set keys independent of order and case', () => {
    expect(termSetKey(['Beta', 'alpha', 'Gamma Ray', 'delta'])).toBe(termSetKey([' delta ', 'GAMMA  RAY', 'ALPHA', 'beta']))
    expect(sameTermSet(['Beta', 'alpha'], ['alpha', 'Beta'])).toBe(true)
    expect(sameTermSet(['Beta', 'alpha'], ['alpha', 'Theta'])).toBe(false)
  })
})
