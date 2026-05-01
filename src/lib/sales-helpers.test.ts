import { describe, it, expect } from 'vitest'
import {
  decimalsForCurrency,
  roundToCurrencyDecimals,
  startOfUtcDay,
  startOfPrevUtcDay,
  computeExpectedCash,
  computeVariance,
} from './sales-helpers'

describe('decimalsForCurrency', () => {
  it('returns 0 for zero-decimal currencies', () => {
    expect(decimalsForCurrency('CLP')).toBe(0)
    expect(decimalsForCurrency('JPY')).toBe(0)
    expect(decimalsForCurrency('KRW')).toBe(0)
  })

  it('returns 2 for everything else', () => {
    expect(decimalsForCurrency('USD')).toBe(2)
    expect(decimalsForCurrency('EUR')).toBe(2)
    expect(decimalsForCurrency('PEN')).toBe(2)
    expect(decimalsForCurrency('XXX-unknown')).toBe(2)
  })
})

describe('roundToCurrencyDecimals', () => {
  it('rounds USD to 2 decimals', () => {
    expect(roundToCurrencyDecimals(10.123, 'USD')).toBe(10.12)
    expect(roundToCurrencyDecimals(10.125, 'USD')).toBe(10.13)
    expect(roundToCurrencyDecimals(0.1 + 0.2, 'USD')).toBe(0.3)
  })

  it('rounds CLP to 0 decimals', () => {
    expect(roundToCurrencyDecimals(123.7, 'CLP')).toBe(124)
    expect(roundToCurrencyDecimals(123.4, 'CLP')).toBe(123)
  })

  it('returns 0 unchanged', () => {
    expect(roundToCurrencyDecimals(0, 'USD')).toBe(0)
  })
})

describe('startOfUtcDay', () => {
  it('returns midnight UTC of the given date', () => {
    const d = new Date('2026-04-29T15:43:00Z')
    expect(startOfUtcDay(d).toISOString()).toBe('2026-04-29T00:00:00.000Z')
  })
})

describe('startOfPrevUtcDay', () => {
  it('returns midnight UTC of the previous day', () => {
    const d = new Date('2026-04-29T15:43:00Z')
    expect(startOfPrevUtcDay(d).toISOString()).toBe('2026-04-28T00:00:00.000Z')
  })
})

describe('computeExpectedCash', () => {
  it('adds startingCash and cashSalesTotal', () => {
    expect(computeExpectedCash(50, 180, 'USD')).toBe(230)
  })

  it('rounds to currency decimals (USD)', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS; rounding fixes it.
    expect(computeExpectedCash(0.1, 0.2, 'USD')).toBe(0.3)
  })

  it('rounds to 0 decimals for zero-decimal currencies', () => {
    expect(computeExpectedCash(100, 50.7, 'JPY')).toBe(151)
  })

  it('handles zero starting cash', () => {
    expect(computeExpectedCash(0, 100, 'USD')).toBe(100)
  })
})

describe('computeVariance', () => {
  it('counted equals expected returns 0', () => {
    expect(computeVariance(230, 230, 'USD')).toBe(0)
  })

  it('drawer short returns negative', () => {
    expect(computeVariance(228, 230, 'USD')).toBe(-2)
  })

  it('drawer over returns positive', () => {
    expect(computeVariance(232, 230, 'USD')).toBe(2)
  })

  it('rounds to currency decimals', () => {
    expect(computeVariance(228.456, 230.123, 'USD')).toBe(-1.67)
  })

  it('rounds to 0 decimals for zero-decimal currency', () => {
    expect(computeVariance(228.7, 230.4, 'JPY')).toBe(-2)
  })
})
