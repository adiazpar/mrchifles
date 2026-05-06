// Reserved top-level paths that are not business IDs. Mirrors the list
// formerly in src/lib/navigation.ts (deleted in Phase 2.2 along with the
// rest of the client-only nav helpers). Kept inline here so layer-stack
// — the last surviving client-side navigation utility in apps/api —
// remains self-contained until Phase 13.1 retires it entirely.
const RESERVED_PATHS = ['login', 'register', 'account', 'join']

function getBusinessIdFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null
  const firstSegment = segments[0]
  if (RESERVED_PATHS.includes(firstSegment)) return null
  return firstSegment || null
}

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

const TABS: readonly BusinessTab[] = ['home', 'sales', 'products', 'manage'] as const

function isBusinessTab(s: string | undefined): s is BusinessTab {
  return s !== undefined && (TABS as readonly string[]).includes(s)
}

// Returns the business-root descriptor implied by a path, OR null if the
// path is not in a business context.
function businessRootForPath(pathname: string): LayerDescriptor | null {
  const businessId = getBusinessIdFromPath(pathname)
  if (!businessId) return null
  const segments = pathname.split('?')[0].split('/').filter(Boolean)
  const tab = segments[1]
  if (isBusinessTab(tab)) {
    return { kind: 'business-root', businessId, activeTab: tab }
  }
  // Drill-down segments (providers, team, providers/<id>) all collapse
  // to the manage tab — that's where they're reached from in the IA.
  return { kind: 'business-root', businessId, activeTab: 'manage' }
}

// Hub-root is ALWAYS at depth 0. Business-context paths add business-root
// at depth 1. Drill-downs stack on top. /account adds account on top of
// whatever underlay context (hub or business) the user came from.
//
// This means peel / "go back" navigation reveals the layer underneath
// uniformly: drill-down → its parent; business → hub; account → its
// captured underlay. There is no "context swap" that introduces a new
// root from offscreen — the underlay is always already mounted.
export function getLayerStack(pathname: string): LayerDescriptor[] {
  const path = (pathname || '/').split('?')[0]
  const hub: LayerDescriptor = { kind: 'hub-root' }

  if (path === '/account' || path.startsWith('/account/')) {
    const underlayRaw = getAccountUnderlay() || '/'
    const underlayBiz = businessRootForPath(underlayRaw)
    if (underlayBiz) {
      return [hub, underlayBiz, { kind: 'account' }]
    }
    return [hub, { kind: 'account' }]
  }

  const businessId = getBusinessIdFromPath(path)
  if (!businessId) return [hub]

  const tail = path.slice(`/${businessId}`.length).split('/').filter(Boolean)

  // Bare /<biz> or /<biz>/ — default to home tab.
  if (tail.length === 0) {
    return [hub, { kind: 'business-root', businessId, activeTab: 'home' }]
  }

  const first = tail[0]
  if (isBusinessTab(first)) {
    return [hub, { kind: 'business-root', businessId, activeTab: first }]
  }
  if (first === 'providers') {
    const businessRoot: LayerDescriptor = {
      kind: 'business-root',
      businessId,
      activeTab: 'manage',
    }
    if (tail.length === 1) {
      return [hub, businessRoot, { kind: 'providers', businessId }]
    }
    const providerId = tail[1]
    return [
      hub,
      businessRoot,
      { kind: 'providers', businessId },
      { kind: 'provider-detail', businessId, providerId },
    ]
  }
  if (first === 'team') {
    return [
      hub,
      { kind: 'business-root', businessId, activeTab: 'manage' },
      { kind: 'team', businessId },
    ]
  }

  // Unknown segment — fall back to business home.
  return [hub, { kind: 'business-root', businessId, activeTab: 'home' }]
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
