// Reserved top-level paths that are not business IDs
const RESERVED_PATHS = ['login', 'register', 'account', 'join']

/**
 * Extract businessId from pathname if it's a business route.
 * Returns null for hub routes and reserved paths.
 */
export function getBusinessIdFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null
  const firstSegment = segments[0]
  if (RESERVED_PATHS.includes(firstSegment)) return null
  return firstSegment || null
}

/**
 * Route config for page headers
 * Maps pathname patterns to header content
 *
 * In the multi-business architecture:
 * - Header title = Business name (from BusinessContext)
 * - Header subtitle = Page name (from this config)
 * - backTo = Parent route for nested pages (relative path, businessId added dynamically)
 */
interface RouteConfig {
  title?: string    // Main title (used for hub pages like Account)
  pageTitle: string // Displays as subtitle under business name or title
  backTo?: string   // Relative path (e.g., '/products'), businessId prefix added dynamically
}

// Route configs keyed by the path segment after businessId
const ROUTE_CONFIGS: Record<string, RouteConfig> = {
  'home': { pageTitle: 'Home' },
  'sales': { pageTitle: 'Sales' },
  'products': { pageTitle: 'Products' },
  'manage': { pageTitle: 'Manage' },
  'team': { pageTitle: 'Team', backTo: '/manage' },
  'providers': { pageTitle: 'Providers', backTo: '/manage' },
}

/**
 * Get route config for a pathname (business-scoped routes only).
 */
export function getRouteConfig(pathname: string): RouteConfig & { businessId?: string } {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) {
    return { pageTitle: '' }
  }

  // First segment is businessId
  const businessId = segments[0]
  const routePath = segments.slice(1).join('/')

  // Look up route config
  const config = ROUTE_CONFIGS[routePath]
  if (config) {
    return { ...config, businessId }
  }

  // Dynamic-segment match: `providers/<id>` -> Provider detail subpage
  if (routePath.startsWith('providers/') && routePath !== 'providers') {
    return { pageTitle: 'Providers', backTo: '/providers', businessId }
  }

  // Try parent paths for nested routes
  const routeSegments = routePath.split('/')
  while (routeSegments.length > 0) {
    routeSegments.pop()
    const parentPath = routeSegments.join('/')
    if (ROUTE_CONFIGS[parentPath]) {
      return { ...ROUTE_CONFIGS[parentPath], businessId }
    }
  }

  return { pageTitle: '', businessId }
}

