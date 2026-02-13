import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for the Mr. Chifles application
 *
 * Note: Auth checks are handled client-side via AuthGuard component
 * because PocketBase uses localStorage (not cookies) for auth state.
 * Server-side middleware cannot access localStorage.
 */
export function middleware(request: NextRequest) {
  // No server-side auth checks - handled by client-side AuthGuard
  // This middleware is kept for future non-auth middleware needs
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (icons, manifest, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json).*)',
  ],
}
