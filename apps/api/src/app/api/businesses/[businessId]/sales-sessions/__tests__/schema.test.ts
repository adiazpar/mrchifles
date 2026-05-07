import { describe, it, expect } from 'vitest'
import { openSessionSchema, closeSessionSchema } from '../schema'

describe('openSessionSchema', () => {
  it('accepts startingCash = 0', () => {
    expect(openSessionSchema.safeParse({ startingCash: 0 }).success).toBe(true)
  })

  it('accepts startingCash > 0', () => {
    expect(openSessionSchema.safeParse({ startingCash: 50.25 }).success).toBe(true)
  })

  it('rejects negative startingCash', () => {
    expect(openSessionSchema.safeParse({ startingCash: -1 }).success).toBe(false)
  })

  it('rejects NaN', () => {
    expect(openSessionSchema.safeParse({ startingCash: NaN }).success).toBe(false)
  })

  it('rejects infinity', () => {
    expect(openSessionSchema.safeParse({ startingCash: Infinity }).success).toBe(false)
  })

  it('rejects missing startingCash', () => {
    expect(openSessionSchema.safeParse({}).success).toBe(false)
  })
})

describe('closeSessionSchema', () => {
  it('accepts countedCash = 0', () => {
    expect(closeSessionSchema.safeParse({ countedCash: 0 }).success).toBe(true)
  })

  it('accepts countedCash with decimals', () => {
    expect(closeSessionSchema.safeParse({ countedCash: 228.50 }).success).toBe(true)
  })

  it('accepts optional notes', () => {
    expect(closeSessionSchema.safeParse({ countedCash: 100, notes: 'short on a comp' }).success).toBe(true)
  })

  it('rejects negative countedCash', () => {
    expect(closeSessionSchema.safeParse({ countedCash: -1 }).success).toBe(false)
  })

  it('rejects notes longer than 500 chars', () => {
    expect(closeSessionSchema.safeParse({
      countedCash: 100,
      notes: 'x'.repeat(501),
    }).success).toBe(false)
  })

  it('accepts notes at exactly 500 chars', () => {
    expect(closeSessionSchema.safeParse({
      countedCash: 100,
      notes: 'x'.repeat(500),
    }).success).toBe(true)
  })
})
