import { describe, expect, it } from 'vitest'

import { nameInitials } from './display-name'

describe('nameInitials', () => {
  it('takes the first letters of up to two words, uppercased', () => {
    expect(nameInitials('Jane Doe')).toBe('JD')
    expect(nameInitials('jane doe')).toBe('JD')
  })

  it('uses just the first letter for a single word', () => {
    expect(nameInitials('Madonna')).toBe('M')
  })

  it('caps at the first two words for longer names', () => {
    expect(nameInitials('Ada King Lovelace')).toBe('AK')
  })

  it('collapses surrounding and repeated whitespace', () => {
    expect(nameInitials('  Jane   Doe  ')).toBe('JD')
  })

  it('falls back to ? for empty / whitespace / nullish input', () => {
    expect(nameInitials('')).toBe('?')
    expect(nameInitials('   ')).toBe('?')
    expect(nameInitials(null)).toBe('?')
    expect(nameInitials(undefined)).toBe('?')
  })
})
