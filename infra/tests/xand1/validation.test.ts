import { describe, expect, it } from 'vitest'
import { validateGeneratedBoard } from '../../lambda/xand1/shared/validation'

const validBoard = {
  categories: [
    { title: 'Planets', difficultyIndex: 1, terms: ['Mars', 'Venus', 'Saturn', 'Neptune'], explanation: 'They are planets.' },
    { title: 'Keyboard keys', difficultyIndex: 0, terms: ['Shift', 'Tab', 'Enter', 'Escape'], explanation: 'They are keyboard keys.' },
    { title: 'Poetry feet', difficultyIndex: 3, terms: ['Iamb', 'Trochee', 'Dactyl', 'Anapest'], explanation: 'They are metrical feet.' },
    { title: 'Cooking cuts', difficultyIndex: 2, terms: ['Dice', 'Julienne', 'Mince', 'Chiffonade'], explanation: 'They are ways to cut food.' },
  ],
}

describe('xand1 generated-board validation', () => {
  it('accepts valid generated boards and sorts categories by difficulty', () => {
    const result = validateGeneratedBoard(validBoard)
    expect(result.categories.map((category) => category.difficultyIndex)).toEqual([0, 1, 2, 3])
    expect(result.categories[0].terms).toEqual(['Shift', 'Tab', 'Enter', 'Escape'])
  })

  it('rejects duplicate terms case-insensitively', () => {
    const invalid = structuredClone(validBoard)
    invalid.categories[1].terms[0] = 'mars'
    expect(() => validateGeneratedBoard(invalid)).toThrow(/globally unique/)
  })

  it('rejects incomplete difficulty sets', () => {
    const invalid = structuredClone(validBoard)
    invalid.categories[0].difficultyIndex = 0
    expect(() => validateGeneratedBoard(invalid)).toThrow(/exactly 0, 1, 2, and 3/)
  })
})
