import { describe, it, expect, beforeEach } from 'vitest'
import { getLayerStack } from './layer-stack'

describe('getLayerStack', () => {
  beforeEach(() => sessionStorage.clear())

  it('returns [hub-root] for /', () => {
    expect(getLayerStack('/')).toEqual([{ kind: 'hub-root' }])
  })

  it('returns [business-root(home)] for /<biz>/home', () => {
    expect(getLayerStack('/abc/home')).toEqual([
      { kind: 'business-root', businessId: 'abc', activeTab: 'home' },
    ])
  })

  it('returns [business-root(sales)] for /<biz>/sales', () => {
    expect(getLayerStack('/abc/sales')).toEqual([
      { kind: 'business-root', businessId: 'abc', activeTab: 'sales' },
    ])
  })

  it('returns [business-root(manage), providers] for /<biz>/providers', () => {
    expect(getLayerStack('/abc/providers')).toEqual([
      { kind: 'business-root', businessId: 'abc', activeTab: 'manage' },
      { kind: 'providers', businessId: 'abc' },
    ])
  })

  it('returns [business-root(manage), team] for /<biz>/team', () => {
    expect(getLayerStack('/abc/team')).toEqual([
      { kind: 'business-root', businessId: 'abc', activeTab: 'manage' },
      { kind: 'team', businessId: 'abc' },
    ])
  })

  it('returns [business-root(manage), providers, provider-detail] for /<biz>/providers/<id>', () => {
    expect(getLayerStack('/abc/providers/p1')).toEqual([
      { kind: 'business-root', businessId: 'abc', activeTab: 'manage' },
      { kind: 'providers', businessId: 'abc' },
      { kind: 'provider-detail', businessId: 'abc', providerId: 'p1' },
    ])
  })

  it('ignores search params', () => {
    expect(getLayerStack('/abc/providers/p1?tab=notes')).toEqual([
      { kind: 'business-root', businessId: 'abc', activeTab: 'manage' },
      { kind: 'providers', businessId: 'abc' },
      { kind: 'provider-detail', businessId: 'abc', providerId: 'p1' },
    ])
  })

  it('uses /account underlay from sessionStorage', () => {
    sessionStorage.setItem('layer.accountUnderlay', '/abc/sales')
    expect(getLayerStack('/account')).toEqual([
      { kind: 'business-root', businessId: 'abc', activeTab: 'sales' },
      { kind: 'account' },
    ])
  })

  it('falls back to hub-root for /account when no underlay stored', () => {
    expect(getLayerStack('/account')).toEqual([
      { kind: 'hub-root' },
      { kind: 'account' },
    ])
  })

  it('normalizes deep account underlay to root tab', () => {
    sessionStorage.setItem('layer.accountUnderlay', '/abc/providers/p1')
    expect(getLayerStack('/account')).toEqual([
      { kind: 'business-root', businessId: 'abc', activeTab: 'manage' },
      { kind: 'account' },
    ])
  })

  it('falls back to hub-root for unknown URLs', () => {
    expect(getLayerStack('/login')).toEqual([{ kind: 'hub-root' }])
    expect(getLayerStack('')).toEqual([{ kind: 'hub-root' }])
  })
})
