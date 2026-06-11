import { describe, expect, it } from 'vitest'
import { validateGeneratedBoard } from '../../lambda/xand1/shared/validation'

const validBoard = {
  categories: [
    { title: 'Planets', alternativeTitles: ['Solar system planets', 'Worlds', 'Major planets', 'Orbital bodies'], difficultyIndex: 1, terms: ['Mars', 'Venus', 'Saturn', 'Neptune'], explanation: 'They are planets.' },
    { title: 'Keyboard keys', alternativeTitles: ['Computer keys', 'Input keys', 'Typing keys', 'Keys on a keyboard'], difficultyIndex: 0, terms: ['Shift', 'Tab', 'Enter', 'Escape'], explanation: 'They are keyboard keys.' },
    { title: 'Poetry feet', alternativeTitles: ['Metric feet', 'Metrical feet', 'Verse rhythms', 'Prosodic feet'], difficultyIndex: 3, terms: ['Iamb', 'Trochee', 'Dactyl', 'Anapest'], explanation: 'They are metrical feet.' },
    { title: 'Cooking cuts', alternativeTitles: ['Knife cuts', 'Food cuts', 'Culinary cuts', 'Cutting techniques'], difficultyIndex: 2, terms: ['Dice', 'Julienne', 'Mince', 'Chiffonade'], explanation: 'They are ways to cut food.' },
  ],
}

describe('xand1 generated-board validation', () => {
  it('accepts valid generated boards and sorts categories by difficulty', () => {
    const result = validateGeneratedBoard(validBoard)
    expect(result.categories.map((category) => category.difficultyIndex)).toEqual([0, 1, 2, 3])
    expect(result.categories[0].terms).toEqual(['Shift', 'Tab', 'Enter', 'Escape'])
  })

  it('dedupes alternative titles against title and each other', () => {
    const valid = structuredClone(validBoard)
    valid.categories[0].alternativeTitles = ['Planets', 'Worlds', 'worlds', 'Major planets', 'Orbital bodies', 'Solar system planets']
    const result = validateGeneratedBoard(valid)
    expect(result.categories[1].alternativeTitles).toEqual(['Worlds', 'Major planets', 'Orbital bodies', 'Solar system planets'])
  })

  it('rejects too few unique alternative titles', () => {
    const invalid = structuredClone(validBoard)
    invalid.categories[0].alternativeTitles = ['Planets', 'Worlds', 'worlds', 'Major planets']
    expect(() => validateGeneratedBoard(invalid)).toThrow(/at least four unique/)
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
