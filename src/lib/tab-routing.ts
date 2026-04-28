// Tab routing helpers for the [businessId] layout. Pure functions so they
// can be tested in isolation and called freely from React render code.

export const TAB_IDS = ['home', 'products', 'sales', 'providers', 'team', 'manage'] as const
export type TabId = typeof TAB_IDS[number]

const DEFAULT_TAB: TabId = 'home'

// Returns the active tab id for a given pathname. Falls back to
// DEFAULT_TAB ('home') for unexpected URLs so TabShell always has a sane
// view to render — Next.js routing will 404 truly invalid routes before
// TabShell ever sees them.
export function getActiveTab(pathname: string, businessId: string): TabId {
  const prefix = `/${businessId}/`
  if (!businessId || !pathname.startsWith(prefix)) return DEFAULT_TAB
  const segment = pathname.slice(prefix.length).split('/')[0]
  return (TAB_IDS as readonly string[]).includes(segment)
    ? (segment as TabId)
    : DEFAULT_TAB
}

// True iff the pathname is a drill-down (more than one segment past the
// businessId). /<biz>/<tab>/<more> is a drill-down. /<biz>/<tab> and
// /<biz>/<tab>/ are tab roots. /<biz> alone is treated as a tab root.
export function isDrillDownPath(pathname: string, businessId: string): boolean {
  const prefix = `/${businessId}/`
  if (!businessId || !pathname.startsWith(prefix)) return false
  const segments = pathname.slice(prefix.length).split('/').filter(Boolean)
  return segments.length > 1
}
