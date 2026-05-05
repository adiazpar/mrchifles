import { getBusinessIdFromPath } from './navigation'

export type BusinessTab = 'home' | 'sales' | 'products' | 'manage'

export type LayerDescriptor =
  | { kind: 'hub-root' }
  | { kind: 'business-root'; businessId: string; activeTab: BusinessTab }
  | { kind: 'providers'; businessId: string }
  | { kind: 'team'; businessId: string }
  | { kind: 'provider-detail'; businessId: string; providerId: string }
  | { kind: 'account' }

const ACCOUNT_UNDERLAY_KEY = 'layer.accountUnderlay'

export function getAccountUnderlay(): string | null {
  if (typeof window === 'undefined') return null
  try { return window.sessionStorage.getItem(ACCOUNT_UNDERLAY_KEY) }
  catch { return null }
}

export function setAccountUnderlay(path: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(ACCOUNT_UNDERLAY_KEY, path)
  } catch {
    // Private mode / quota / disabled storage — nothing to do.
  }
}

export function clearAccountUnderlay(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(ACCOUNT_UNDERLAY_KEY)
  } catch {
    // Private mode / quota / disabled storage — nothing to do.
  }
}

function rootForPath(pathname: string): LayerDescriptor {
  const businessId = getBusinessIdFromPath(pathname)
  if (!businessId) return { kind: 'hub-root' }
  // Top-level business segments map directly to the active tab.
  // Drill-down segments (providers, team, providers/<id>) collapse to manage.
  const segments = pathname.split('?')[0].split('/').filter(Boolean)
  const tab = segments[1] as BusinessTab | undefined
  if (tab === 'home' || tab === 'sales' || tab === 'products' || tab === 'manage') {
    return { kind: 'business-root', businessId, activeTab: tab }
  }
  return { kind: 'business-root', businessId, activeTab: 'manage' }
}

export function getLayerStack(pathname: string): LayerDescriptor[] {
  const path = (pathname || '/').split('?')[0]

  if (path === '/account' || path.startsWith('/account/')) {
    const underlayRaw = getAccountUnderlay() || '/'
    const underlay = rootForPath(underlayRaw)
    return [underlay, { kind: 'account' }]
  }

  const businessId = getBusinessIdFromPath(path)
  if (!businessId) return [{ kind: 'hub-root' }]

  const tail = path.slice(`/${businessId}`.length).split('/').filter(Boolean)
  // Tail is empty or a tab — just the business root.
  if (tail.length === 0) {
    return [{ kind: 'business-root', businessId, activeTab: 'home' }]
  }
  const first = tail[0]
  if (first === 'home' || first === 'sales' || first === 'products' || first === 'manage') {
    return [{ kind: 'business-root', businessId, activeTab: first }]
  }
  if (first === 'providers') {
    const root: LayerDescriptor = { kind: 'business-root', businessId, activeTab: 'manage' }
    if (tail.length === 1) return [root, { kind: 'providers', businessId }]
    const providerId = tail[1]
    return [
      root,
      { kind: 'providers', businessId },
      { kind: 'provider-detail', businessId, providerId },
    ]
  }
  if (first === 'team') {
    return [
      { kind: 'business-root', businessId, activeTab: 'manage' },
      { kind: 'team', businessId },
    ]
  }
  // Unknown segment — fall back to home root.
  return [{ kind: 'business-root', businessId, activeTab: 'home' }]
}

export function getLayerKey(d: LayerDescriptor): string {
  switch (d.kind) {
    case 'hub-root': return 'hub-root'
    case 'business-root': return `business-root:${d.businessId}`
    case 'providers': return `providers:${d.businessId}`
    case 'team': return `team:${d.businessId}`
    case 'provider-detail': return `provider-detail:${d.businessId}:${d.providerId}`
    case 'account': return 'account'
  }
}
