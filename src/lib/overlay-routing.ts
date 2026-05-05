import { isDrillDownPath } from './tab-routing'
import { getBusinessIdFromPath } from './navigation'

export type OverlayKind = 'hub' | 'business' | null

const HUB_OVERLAY_PATHS = ['/account', '/join'] as const

export function classifyOverlayRoute(pathname: string | null | undefined): OverlayKind {
  if (!pathname) return null
  for (const p of HUB_OVERLAY_PATHS) {
    if (pathname === p || pathname.startsWith(`${p}/`)) return 'hub'
  }
  const businessId = getBusinessIdFromPath(pathname)
  if (businessId && isDrillDownPath(pathname, businessId)) return 'business'
  return null
}
