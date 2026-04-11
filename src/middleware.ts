import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/simple-auth'

/**
 * Middleware for Kasero
 *
 * Protects dashboard routes - redirects to login if not authenticated.
 * Public routes (login, register, etc.) are accessible without auth.
 *
 * Route patterns:
 * - / - Hub page (authenticated, picks business)
 * - /[businessId]/* - Business-scoped routes
 * - /account - User-level settings
 * - /join - Join business with invite code (authenticated)
 * - /login, /register - Public auth routes
 */

// Routes that don't require authentication
const publicPaths = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/me', // Auth check endpoint - returns { user: null } if not authenticated
]

// Check if path is public
function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname.startsWith(path))
}

// Check if path is a static asset or API
function shouldSkip(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') // Static files (favicon.ico, etc.)
  )
}

// Validate businessId format (nanoid pattern - 21 chars alphanumeric with - and _)
function isValidBusinessId(id: string): boolean {
  // nanoid default: 21 chars, A-Za-z0-9_-
  return /^[A-Za-z0-9_-]{21}$/.test(id)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static assets
  if (shouldSkip(pathname) && !pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Check for auth token
  const token = getTokenFromRequest(request)

  if (!token) {
    // No token - redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verify token
  const payload = await verifyToken(token)

  if (!payload) {
    // Invalid token - redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // For business-scoped routes, validate businessId format
  // The actual access validation happens in BusinessContext
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0) {
    const potentialBusinessId = segments[0]
    // Check if this looks like a business route (not a known route like 'account', 'business')
    const knownRoutes = ['account', 'business', 'login', 'register', 'join']
    if (!knownRoutes.includes(potentialBusinessId)) {
      // This might be a business ID route - validate format
      if (!isValidBusinessId(potentialBusinessId)) {
        // Invalid businessId format - redirect to hub
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  // Token is valid - allow request
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (icons, manifest, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|animations).*)',
  ],
}
