import { describe, it, expect, beforeEach } from 'vitest'
import {
  getLayerStack,
  getAccountUnderlay,
  setAccountUnderlay,
  clearAccountUnderlay,
} from './layer-stack'

describe('getLayerStack', () => {
  beforeEach(() => sessionStorage.clear())

  it('returns [hub-root] for /', () => {
    expect(getLayerStack('/')).toEqual([{ kind: 'hub-root' }])
  })

  it('returns [hub, business(home)] for /<biz>/home', () => {
    expect(getLayerStack('/abc/home')).toEqual([
      { kind: 'hub-root' },
      { kind: 'business-root', businessId: 'abc', activeTab: 'home' },
    ])
  })

  it('returns [hub, business(sales)] for /<biz>/sales', () => {
    expect(getLayerStack('/abc/sales')).toEqual([
      { kind: 'hub-root' },
      { kind: 'business-root', businessId: 'abc', activeTab: 'sales' },
    ])
  })

  it('returns [hub, business(manage)] for /<biz>/manage', () => {
    expect(getLayerStack('/abc/manage')).toEqual([
      { kind: 'hub-root' },
      { kind: 'business-root', businessId: 'abc', activeTab: 'manage' },
    ])
  })

  it('returns [hub, business(home)] for bare /<biz>', () => {
    expect(getLayerStack('/abc')).toEqual([
      { kind: 'hub-root' },
      { kind: 'business-root', businessId: 'abc', activeTab: 'home' },
    ])
  })

  it('returns [hub, business(manage), providers] for /<biz>/providers', () => {
    expect(getLayerStack('/abc/providers')).toEqual([
      { kind: 'hub-root' },
      { kind: 'business-root', businessId: 'abc', activeTab: 'manage' },
      { kind: 'providers', businessId: 'abc' },
    ])
  })

  it('returns [hub, business(manage), team] for /<biz>/team', () => {
    expect(getLayerStack('/abc/team')).toEqual([
      { kind: 'hub-root' },
      { kind: 'business-root', businessId: 'abc', activeTab: 'manage' },
      { kind: 'team', businessId: 'abc' },
    ])
  })

  it('returns 4-layer stack for /<biz>/providers/<id>', () => {
    expect(getLayerStack('/abc/providers/p1')).toEqual([
      { kind: 'hub-root' },
      { kind: 'business-root', businessId: 'abc', activeTab: 'manage' },
      { kind: 'providers', businessId: 'abc' },
      { kind: 'provider-detail', businessId: 'abc', providerId: 'p1' },
    ])
  })

  it('ignores search params', () => {
    expect(getLayerStack('/abc/providers/p1?tab=notes')).toEqual([
      { kind: 'hub-root' },
      { kind: 'business-root', businessId: 'abc', activeTab: 'manage' },
      { kind: 'providers', businessId: 'abc' },
      { kind: 'provider-detail', businessId: 'abc', providerId: 'p1' },
    ])
  })

  it('falls back to [hub, business(home)] for unknown business segment', () => {
    expect(getLayerStack('/abc/garbage')).toEqual([
      { kind: 'hub-root' },
      { kind: 'business-root', businessId: 'abc', activeTab: 'home' },
    ])
  })

  it('places /account on top of hub when no underlay stored', () => {
    expect(getLayerStack('/account')).toEqual([
      { kind: 'hub-root' },
      { kind: 'account' },
    ])
  })

  it('places /account on top of [hub, business] when underlay is a business path', () => {
    setAccountUnderlay('/abc/sales')
    expect(getLayerStack('/account')).toEqual([
      { kind: 'hub-root' },
      { kind: 'business-root', businessId: 'abc', activeTab: 'sales' },
      { kind: 'account' },
    ])
  })

  it('normalizes deep account underlay to the underlying tab root (not the drill-down trail)', () => {
    setAccountUnderlay('/abc/providers/p1')
    expect(getLayerStack('/account')).toEqual([
      { kind: 'hub-root' },
      { kind: 'business-root', businessId: 'abc', activeTab: 'manage' },
      { kind: 'account' },
    ])
  })

  it('falls back to hub-only for unknown URLs', () => {
    expect(getLayerStack('/login')).toEqual([{ kind: 'hub-root' }])
    expect(getLayerStack('')).toEqual([{ kind: 'hub-root' }])
  })
})

describe('account underlay session helpers — SSR safety', () => {
  it('getAccountUnderlay returns null when window is undefined', () => {
    const original = globalThis.window
    // @ts-expect-error simulate SSR
    delete globalThis.window
    try {
      expect(getAccountUnderlay()).toBeNull()
    } finally {
      globalThis.window = original
    }
  })

  it('setAccountUnderlay/clearAccountUnderlay no-op when window is undefined', () => {
    const original = globalThis.window
    // @ts-expect-error simulate SSR
    delete globalThis.window
    try {
      expect(() => setAccountUnderlay('/abc/sales')).not.toThrow()
      expect(() => clearAccountUnderlay()).not.toThrow()
    } finally {
      globalThis.window = original
    }
  })
})
