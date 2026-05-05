// Tab routing helpers for the [businessId] layout. Pure functions so they
// can be tested in isolation and called freely from React render code.

export const TAB_IDS = ['home', 'sales', 'products', 'manage'] as const
export type TabId = typeof TAB_IDS[number]

const DEFAULT_TAB: TabId = 'home'

// Returns the active tab id for a given pathname. Falls back to
// DEFAULT_TAB ('home') for non-tab segments — providers/team are
// drill-downs, not tabs.
export function getActiveTab(pathname: string, businessId: string): TabId {
  const prefix = `/${businessId}/`
  if (!businessId || !pathname.startsWith(prefix)) return DEFAULT_TAB
  const segment = pathname.slice(prefix.length).split('/')[0]
  return (TAB_IDS as readonly string[]).includes(segment)
    ? (segment as TabId)
    : DEFAULT_TAB
}

// True iff the pathname is a drill-down. With TAB_IDS now 4 entries, any
// segment under businessId that is NOT one of those 4 is a drill-down,
// including single-segment paths like /<biz>/providers and /<biz>/team.
// Bare /<biz> is treated as a tab root.
export function isDrillDownPath(pathname: string, businessId: string): boolean {
  const prefix = `/${businessId}/`
  if (!businessId || !pathname.startsWith(prefix)) return false
  const segments = pathname.slice(prefix.length).split('/').filter(Boolean)
  if (segments.length === 0) return false
  if (segments.length > 1) return true
  return !(TAB_IDS as readonly string[]).includes(segments[0])
}
