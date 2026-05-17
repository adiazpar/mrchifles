import { describe, it, expect } from 'vitest'
import { PAYMENT_METHODS, getMethodById } from './payment-methods'

describe('PAYMENT_METHODS registry', () => {
  it('contains exactly the three schema-enum methods in stable order', () => {
    expect(PAYMENT_METHODS.map((m) => m.id)).toEqual(['cash', 'card', 'other'])
  })

  it('marks only cash as supportsCashTendering', () => {
    expect(PAYMENT_METHODS.find((m) => m.id === 'cash')!.supportsCashTendering).toBe(true)
    expect(PAYMENT_METHODS.find((m) => m.id === 'card')!.supportsCashTendering).toBe(false)
    expect(PAYMENT_METHODS.find((m) => m.id === 'other')!.supportsCashTendering).toBe(false)
  })

  it('every entry carries the required metadata', () => {
    for (const m of PAYMENT_METHODS) {
      expect(m.id).toBeTruthy()
      expect(m.labelKey).toMatch(/^sales\.cart\.modal_method_/)
      expect(m.icon).toBeDefined()
      expect(m.colorToken).toMatch(/^var\(--/)
    }
  })

  it('every entry carries a subtleBg via a CSS var token', () => {
    for (const m of PAYMENT_METHODS) {
      expect(m.subtleBg).toBeDefined()
      expect(m.subtleBg).toMatch(/^var\(--/)
    }
  })
})

describe('getMethodById', () => {
  it('returns the entry for a known id', () => {
    expect(getMethodById('cash').id).toBe('cash')
  })

  it('throws for an unknown id', () => {
    // @ts-expect-error testing runtime guard for off-spec ids
    expect(() => getMethodById('bogus')).toThrow()
  })
})
