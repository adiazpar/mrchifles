import { describe, it, expect } from 'vitest'
import { classifyOverlayRoute } from './overlay-routing'

describe('classifyOverlayRoute', () => {
  it('returns null for null/empty input', () => {
    expect(classifyOverlayRoute(null)).toBeNull()
    expect(classifyOverlayRoute('')).toBeNull()
  })

  it('returns null for hub home', () => {
    expect(classifyOverlayRoute('/')).toBeNull()
  })

  it('returns null for auth routes', () => {
    expect(classifyOverlayRoute('/login')).toBeNull()
    expect(classifyOverlayRoute('/register')).toBeNull()
  })

  it('returns "hub" for /account and nested account paths', () => {
    expect(classifyOverlayRoute('/account')).toBe('hub')
    expect(classifyOverlayRoute('/account/')).toBe('hub')
    expect(classifyOverlayRoute('/account/anything')).toBe('hub')
  })

  it('returns "hub" for /join and nested join paths', () => {
    expect(classifyOverlayRoute('/join')).toBe('hub')
    expect(classifyOverlayRoute('/join/abc123')).toBe('hub')
  })

  it('returns null for top-level business tab routes', () => {
    expect(classifyOverlayRoute('/biz-1/home')).toBeNull()
    expect(classifyOverlayRoute('/biz-1/products')).toBeNull()
    expect(classifyOverlayRoute('/biz-1/sales')).toBeNull()
    expect(classifyOverlayRoute('/biz-1/providers')).toBeNull()
    expect(classifyOverlayRoute('/biz-1/team')).toBeNull()
    expect(classifyOverlayRoute('/biz-1/manage')).toBeNull()
  })

  it('returns "business" for drill-down paths under any tab', () => {
    expect(classifyOverlayRoute('/biz-1/providers/abc-123')).toBe('business')
    expect(classifyOverlayRoute('/biz-1/products/xyz')).toBe('business')
  })

  it('returns null for the bare businessId route', () => {
    expect(classifyOverlayRoute('/biz-1')).toBeNull()
  })
})
