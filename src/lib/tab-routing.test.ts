import { describe, it, expect } from 'vitest'
import { getActiveTab, isDrillDownPath, TAB_IDS } from './tab-routing'

describe('TAB_IDS', () => {
  it('includes the 6 known tab ids', () => {
    expect(TAB_IDS).toEqual(['home', 'products', 'sales', 'providers', 'team', 'manage'])
  })
})

describe('getActiveTab', () => {
  const biz = 'abc'

  it('returns the tab id for tab routes', () => {
    expect(getActiveTab('/abc/home', biz)).toBe('home')
    expect(getActiveTab('/abc/products', biz)).toBe('products')
    expect(getActiveTab('/abc/sales', biz)).toBe('sales')
    expect(getActiveTab('/abc/providers', biz)).toBe('providers')
    expect(getActiveTab('/abc/team', biz)).toBe('team')
    expect(getActiveTab('/abc/manage', biz)).toBe('manage')
  })

  it('returns the tab id for drill-down routes (the parent tab)', () => {
    expect(getActiveTab('/abc/providers/xyz-123', biz)).toBe('providers')
  })

  it('handles trailing slash', () => {
    expect(getActiveTab('/abc/providers/', biz)).toBe('providers')
  })

  it('returns DEFAULT_TAB (home) for unknown segments', () => {
    expect(getActiveTab('/abc/garbage', biz)).toBe('home')
  })

  it('returns DEFAULT_TAB for empty businessId', () => {
    expect(getActiveTab('/abc/products', '')).toBe('home')
  })

  it('returns DEFAULT_TAB when pathname is not under businessId', () => {
    expect(getActiveTab('/other/products', biz)).toBe('home')
    expect(getActiveTab('/login', biz)).toBe('home')
    expect(getActiveTab('/', biz)).toBe('home')
  })

  it('returns DEFAULT_TAB for bare /<biz> (no trailing slash)', () => {
    expect(getActiveTab('/abc', biz)).toBe('home')
  })
})

describe('isDrillDownPath', () => {
  const biz = 'abc'

  it('returns false for tab routes', () => {
    expect(isDrillDownPath('/abc/home', biz)).toBe(false)
    expect(isDrillDownPath('/abc/products', biz)).toBe(false)
    expect(isDrillDownPath('/abc/providers', biz)).toBe(false)
  })

  it('returns true for drill-down routes', () => {
    expect(isDrillDownPath('/abc/providers/xyz-123', biz)).toBe(true)
  })

  it('handles trailing slash on tab root (still not drill-down)', () => {
    expect(isDrillDownPath('/abc/providers/', biz)).toBe(false)
  })

  it('returns false for empty businessId', () => {
    expect(isDrillDownPath('/abc/products/foo', '')).toBe(false)
  })

  it('returns false for pathname not under businessId', () => {
    expect(isDrillDownPath('/other/providers/xyz', biz)).toBe(false)
    expect(isDrillDownPath('/login', biz)).toBe(false)
  })

  it('returns false for bare /<biz>', () => {
    expect(isDrillDownPath('/abc', biz)).toBe(false)
  })
})
