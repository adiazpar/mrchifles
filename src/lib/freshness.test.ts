import { describe, it, expect } from 'vitest'
import { isFresh, STALE_AFTER_MS } from './freshness'

describe('isFresh', () => {
  it('returns false when lastFetchedAt is null (never fetched)', () => {
    expect(isFresh(null, 1_000_000)).toBe(false)
  })

  it('returns true when within the freshness window', () => {
    const now = 1_000_000
    expect(isFresh(now - 1, now)).toBe(true)
    expect(isFresh(now - STALE_AFTER_MS + 1, now)).toBe(true)
  })

  it('returns false at and beyond the freshness window', () => {
    const now = 1_000_000
    expect(isFresh(now - STALE_AFTER_MS, now)).toBe(false)
    expect(isFresh(now - STALE_AFTER_MS - 1, now)).toBe(false)
  })

  it('accepts a custom window override', () => {
    const now = 1_000_000
    expect(isFresh(now - 10_000, now, 10_001)).toBe(true)
    expect(isFresh(now - 10_000, now, 10_000)).toBe(false)
  })

  it('returns false for future lastFetchedAt (clock skew)', () => {
    expect(isFresh(2_000_000, 1_000_000)).toBe(false)
  })
})
