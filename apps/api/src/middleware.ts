import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Edge middleware — lightweight gate before page navigations.
 *
 * Session verification is delegated to `auth.api.getSession()` at the
 * route handler / page level. Edge runtime can't reach the database
 * (libsql + Drizzle adapter both need Node APIs), so the most this
 * middleware can do is confirm that the better-auth session cookie is
 * present and redirect to / (EntryPage) when it isn't.
 *
 * Risk model: a present-but-revoked cookie reaches the page, then the
 * page's `getSession()` returns null, and the handler issues its own
 * 401 / redirect. The middleware just keeps unauthenticated traffic
 * from spending a Lambda invocation to find that out.
 *
 * Cookie names this middleware accepts:
 *   - "kasero.session_token"            (dev / non-secure)
 *   - "__Secure-kasero.session_token"   (production, useSecureCookies)
 *
 * Anything more elaborate (signature check, DB lookup, refresh) has to
 * happen off the edge.
 */

const publicPaths = [
  '/',
  '/register',
  '/join',
]

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

function shouldSkip(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  )
}

const BUSINESS_ID_RE = /^[A-Za-z0-9_-]{21}$/

const SESSION_COOKIE_RE = /(?:^|;\s*)(?:__Secure-)?kasero\.session_token=[^;\s]+/

function hasSessionCookie(request: NextRequest): boolean {
  const header = request.headers.get('cookie')
  if (!header) return false
  return SESSION_COOKIE_RE.test(header)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (shouldSkip(pathname)) return NextResponse.next()
  if (isPublicPath(pathname)) return NextResponse.next()

  if (!hasSessionCookie(request)) {
    const entryUrl = new URL('/', request.url)
    entryUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(entryUrl)
  }

  // Defense in depth for /<businessId>/* page routes: reject obviously
  // malformed business id segments (e.g. a 1MB path) before the page
  // handler bothers querying the DB. The full membership check still
  // runs server-side in withBusinessAuth.
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0) {
    const first = segments[0]
    const knownRoutes = ['account', 'business', 'register', 'join']
    if (!knownRoutes.includes(first) && !BUSINESS_ID_RE.test(first)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Anything not /api/*, not /_next/*, not a static asset.
    '/((?!api/|_next/|.*\\.).*)',
  ],
}
