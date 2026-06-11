export const DIFFICULTY_COLORS = ['#352A87', '#0F5CDD', '#00A6A6', '#F9D423'] as const

export function normalizeTerm(term: string) {
  return term.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

export function termSetKey(terms: readonly string[]) {
  return terms.map(normalizeTerm).sort().join('||')
}

export function sameTermSet(left: readonly string[], right: readonly string[]) {
  return termSetKey(left) === termSetKey(right)
}
