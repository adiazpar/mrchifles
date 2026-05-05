import { describe, it, expect } from 'vitest'
import { getActiveTab, isDrillDownPath, TAB_IDS } from './tab-routing'

describe('TAB_IDS', () => {
  it('lists the 4 bottom-nav tabs in declared order', () => {
    expect(TAB_IDS).toEqual(['home', 'sales', 'products', 'manage'])
  })
})

describe('getActiveTab', () => {
  const biz = 'abc'

  it('returns the tab id for tab routes', () => {
    expect(getActiveTab('/abc/home', biz)).toBe('home')
    expect(getActiveTab('/abc/sales', biz)).toBe('sales')
    expect(getActiveTab('/abc/products', biz)).toBe('products')
    expect(getActiveTab('/abc/manage', biz)).toBe('manage')
  })

  it('returns DEFAULT_TAB (home) for non-tab segments', () => {
    expect(getActiveTab('/abc/providers', biz)).toBe('home')
    expect(getActiveTab('/abc/team', biz)).toBe('home')
    expect(getActiveTab('/abc/garbage', biz)).toBe('home')
  })

  it('returns DEFAULT_TAB for empty businessId', () => {
    expect(getActiveTab('/abc/products', '')).toBe('home')
  })
})

describe('isDrillDownPath', () => {
  const biz = 'abc'

  it('returns true for any segment under businessId beyond a tab', () => {
    expect(isDrillDownPath('/abc/providers', biz)).toBe(true)
    expect(isDrillDownPath('/abc/team', biz)).toBe(true)
    expect(isDrillDownPath('/abc/providers/p1', biz)).toBe(true)
  })

  it('returns false for tab routes', () => {
    expect(isDrillDownPath('/abc/home', biz)).toBe(false)
    expect(isDrillDownPath('/abc/sales', biz)).toBe(false)
    expect(isDrillDownPath('/abc/products', biz)).toBe(false)
    expect(isDrillDownPath('/abc/manage', biz)).toBe(false)
  })

  it('returns false for bare /<biz>', () => {
    expect(isDrillDownPath('/abc', biz)).toBe(false)
  })
})
