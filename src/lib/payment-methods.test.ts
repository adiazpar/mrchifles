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
      expect(m.labelKey).toMatch(/^modal_method_/)
      expect(m.icon).toBeDefined()
      expect(m.colorToken).toMatch(/^var\(--/)
    }
  })

  it('only cash and card carry a subtleBg; other has none', () => {
    expect(PAYMENT_METHODS.find((m) => m.id === 'cash')!.subtleBg).toBeDefined()
    expect(PAYMENT_METHODS.find((m) => m.id === 'card')!.subtleBg).toBeDefined()
    expect(PAYMENT_METHODS.find((m) => m.id === 'other')!.subtleBg).toBeUndefined()
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
