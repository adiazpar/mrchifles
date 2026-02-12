import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = [
  '/inicio',
  '/ventas',
  '/productos',
  '/caja',
  '/inventario',
  '/ajustes',
]

// Routes only accessible when NOT authenticated
const authRoutes = ['/login', '/register', '/invite']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for PocketBase auth cookie
  // Note: PocketBase stores auth in localStorage by default, so we also check for a custom cookie
  const pbAuth = request.cookies.get('pb_auth')
  const isAuthenticated = !!pbAuth?.value

  // Redirect authenticated users away from auth pages
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/inicio', request.url))
    }
    return NextResponse.next()
  }

  // Protect dashboard routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      // Note: Since PocketBase uses localStorage, auth state is checked client-side
      // The middleware provides a basic check, but the AuthGuard component handles the real protection
      return NextResponse.next()
    }
  }

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
