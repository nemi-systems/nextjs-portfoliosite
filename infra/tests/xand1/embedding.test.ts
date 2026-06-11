import { describe, expect, it } from 'vitest'
import { centroid, cosineSimilarity, termSetKey, vectorNorm } from '../../lambda/xand1/shared/embedding'

describe('xand1 embedding helpers', () => {
  it('creates order-independent term-set keys', () => {
    expect(termSetKey([' North Star ', 'comet', 'ORBIT', 'solar wind'])).toBe(
      termSetKey(['orbit', 'Solar  Wind', 'north star', 'COMET']),
    )
  })

  it('computes centroids and vector norms', () => {
    const center = centroid([[1, 3], [3, 5]])
    expect(center).toEqual([2, 4])
    expect(vectorNorm([3, 4])).toBe(5)
  })

  it('scores cosine similarity and rejects dimension mismatches', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
    expect(() => cosineSimilarity([1], [1, 2])).toThrow(/matching dimensions/)
  })
})
