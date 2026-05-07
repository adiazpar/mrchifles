import { describe, it, expect } from 'vitest'
import {
  padDailyRevenue,
  padHourly,
  pivotPaymentSplit,
} from './aggregate-helpers'

describe('padDailyRevenue', () => {
  it('returns 7 entries oldest-to-newest, zero-padding missing days', () => {
    const since = new Date('2026-04-27T00:00:00Z') // Mon
    const today = new Date('2026-05-03T00:00:00Z') // Sun (7-day window inclusive)
    const rows = [
      { day: '2026-04-27', total: 100 },
      { day: '2026-04-29', total: 200 },
      { day: '2026-05-03', total: 300 },
    ]
    const out = padDailyRevenue(rows, since, today, 'USD')
    expect(out.map((r) => r.date)).toEqual([
      '2026-04-27',
      '2026-04-28',
      '2026-04-29',
      '2026-04-30',
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
    ])
    expect(out.map((r) => r.total)).toEqual([100, 0, 200, 0, 0, 0, 300])
  })

  it('rounds totals to currency decimals', () => {
    const since = new Date('2026-05-03T00:00:00Z')
    const today = since
    const rows = [{ day: '2026-05-03', total: 0.1 + 0.2 }]
    const out = padDailyRevenue(rows, since, today, 'USD')
    expect(out[0].total).toBe(0.3)
  })

  it('rounds to 0 decimals for zero-decimal currencies', () => {
    const since = new Date('2026-05-03T00:00:00Z')
    const today = since
    const rows = [{ day: '2026-05-03', total: 1500.7 }]
    const out = padDailyRevenue(rows, since, today, 'JPY')
    expect(out[0].total).toBe(1501)
  })

  it('returns 7 zero-padded entries when rows is empty', () => {
    const since = new Date('2026-04-27T00:00:00Z')
    const today = new Date('2026-05-03T00:00:00Z')
    const out = padDailyRevenue([], since, today, 'USD')
    expect(out).toHaveLength(7)
    expect(out.every((r) => r.total === 0)).toBe(true)
  })
})

describe('padHourly', () => {
  it('returns 24 entries hour 0-23, zero-padding missing hours', () => {
    const rows = [
      { hour: 9, total: 50 },
      { hour: 14, total: 200 },
    ]
    const out = padHourly(rows, 'USD')
    expect(out).toHaveLength(24)
    expect(out[9].total).toBe(50)
    expect(out[14].total).toBe(200)
    expect(out[0].total).toBe(0)
    expect(out[23].total).toBe(0)
    expect(out.map((r) => r.hour)).toEqual(
      Array.from({ length: 24 }, (_, i) => i),
    )
  })

  it('rounds to currency decimals', () => {
    const rows = [{ hour: 9, total: 0.1 + 0.2 }]
    const out = padHourly(rows, 'USD')
    expect(out[9].total).toBe(0.3)
  })

  it('returns 24 zeroes when rows is empty', () => {
    const out = padHourly([], 'USD')
    expect(out).toHaveLength(24)
    expect(out.every((r) => r.total === 0)).toBe(true)
  })
})

describe('pivotPaymentSplit', () => {
  it('reshapes rows into a {cash, card, other} object', () => {
    const rows = [
      { paymentMethod: 'cash' as const, total: 1200 },
      { paymentMethod: 'card' as const, total: 800 },
    ]
    const out = pivotPaymentSplit(rows, 'USD')
    expect(out).toEqual({ cash: 1200, card: 800, other: 0 })
  })

  it('returns zeroes for every method when rows is empty', () => {
    const out = pivotPaymentSplit([], 'USD')
    expect(out).toEqual({ cash: 0, card: 0, other: 0 })
  })

  it('rounds each method to currency decimals', () => {
    const rows = [
      { paymentMethod: 'cash' as const, total: 0.1 + 0.2 },
      { paymentMethod: 'card' as const, total: 0.7 + 0.1 },
    ]
    const out = pivotPaymentSplit(rows, 'USD')
    expect(out.cash).toBe(0.3)
    expect(out.card).toBe(0.8)
  })
})
