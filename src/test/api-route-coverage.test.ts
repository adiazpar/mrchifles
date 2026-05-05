/**
 * Route-coverage test (audit M-22).
 *
 * The Edge middleware short-circuits all `/api/*` paths, so each
 * route handler is responsible for invoking the right auth wrapper.
 * A future contributor who forgets the wrapper ships an
 * unauthenticated route — and there's no other gate to catch it.
 *
 * This test reads the source of every route.ts file under the
 * authentication-required tree and asserts the file mentions the
 * expected wrapper. The check is intentionally textual (not runtime)
 * because importing the route modules in a unit test environment
 * pulls in the libsql client, env-validation, fal.ai SDK, etc.
 *
 * If a new route legitimately doesn't need a wrapper (e.g. a public
 * webhook), add it to the corresponding allowlist below WITH a
 * comment explaining why.
 */

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const API_ROOT = join(process.cwd(), 'src', 'app', 'api')

// Routes under /api/businesses/[businessId]/** that DON'T need
// withBusinessAuth. Empty by intent — every business-scoped route
// must pin tenancy via the wrapper.
const BUSINESS_AUTH_ALLOWLIST: ReadonlySet<string> = new Set<string>()

// Routes that legitimately don't use withAuth. These either use a
// different gate (login/register hand-roll their own auth flow) or
// are intentionally public (none today).
const AUTH_ALLOWLIST: ReadonlySet<string> = new Set([
  // Login/register/logout handle the authentication flow themselves;
  // wrapping them in withAuth would be a chicken-and-egg.
  'src/app/api/auth/login/route.ts',
  'src/app/api/auth/register/route.ts',
  'src/app/api/auth/logout/route.ts',
  // /api/auth/me — both GET and DELETE manage their own auth flow
  // (DELETE adds a password reauth before the destructive batch).
  'src/app/api/auth/me/route.ts',
  // /api/auth/change-password manages its own rate-limit + auth
  // flow because it also accepts credentials in the body.
  'src/app/api/auth/change-password/route.ts',
  // Geolocation: returns Vercel-injected IP-based hints, no user
  // data, no DB. Public is intentional.
  'src/app/api/geolocation/route.ts',
  // /api/transfer/{accept,decline} use their own auth flow — they
  // need to look up the recipient by JWT email before admitting them
  // to the transfer-state-machine routes.
  'src/app/api/transfer/accept/route.ts',
  'src/app/api/transfer/decline/route.ts',
  'src/app/api/transfer/incoming/route.ts',
  // /api/invite/validate and /api/invite/join handle their own
  // rate-limit + auth.
  'src/app/api/invite/validate/route.ts',
  'src/app/api/invite/join/route.ts',
  // /api/businesses/list uses getCurrentUser directly — it's the
  // hub-level "what businesses am I in" query.
  'src/app/api/businesses/list/route.ts',
])

function findRouteFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      out.push(...findRouteFiles(full))
    } else if (entry === 'route.ts') {
      out.push(full)
    }
  }
  return out
}

function relativeFromRepo(absolute: string): string {
  return relative(process.cwd(), absolute)
}

describe('API route coverage', () => {
  const allRoutes = findRouteFiles(API_ROOT)

  it('finds at least one route (sanity)', () => {
    expect(allRoutes.length).toBeGreaterThan(0)
  })

  it('every /api/businesses/[businessId]/** route uses withBusinessAuth', () => {
    const businessRoutes = allRoutes.filter((p) =>
      p.includes(`${API_ROOT}/businesses/[businessId]/`),
    )
    expect(businessRoutes.length).toBeGreaterThan(0)

    const offenders: string[] = []
    for (const file of businessRoutes) {
      const rel = relativeFromRepo(file)
      if (BUSINESS_AUTH_ALLOWLIST.has(rel)) continue
      const source = readFileSync(file, 'utf8')
      // Match the import OR the wrapper invocation. Either is enough
      // to demonstrate the route went through the gate.
      const hasWrapper =
        source.includes('withBusinessAuth(') ||
        /\bwithBusinessAuth\b/.test(source)
      if (!hasWrapper) offenders.push(rel)
    }
    expect(offenders, `routes missing withBusinessAuth: ${offenders.join(', ')}`).toEqual([])
  })

  it('every /api/auth/** and /api/user/** mutation route uses withAuth (or is allowlisted)', () => {
    const authRoutes = allRoutes.filter(
      (p) =>
        p.includes(`${API_ROOT}/auth/`) ||
        p.includes(`${API_ROOT}/user/`),
    )
    expect(authRoutes.length).toBeGreaterThan(0)

    const offenders: string[] = []
    for (const file of authRoutes) {
      const rel = relativeFromRepo(file)
      if (AUTH_ALLOWLIST.has(rel)) continue
      const source = readFileSync(file, 'utf8')
      const hasWrapper = /\bwithAuth\b/.test(source)
      if (!hasWrapper) offenders.push(rel)
    }
    expect(offenders, `routes missing withAuth: ${offenders.join(', ')}`).toEqual([])
  })

  it('AI and HEIC routes use withAuth', () => {
    const aiRoutes = allRoutes.filter(
      (p) =>
        p.includes(`${API_ROOT}/ai/`) || p.includes(`${API_ROOT}/convert-heic/`),
    )
    expect(aiRoutes.length).toBeGreaterThan(0)

    const offenders: string[] = []
    for (const file of aiRoutes) {
      const rel = relativeFromRepo(file)
      const source = readFileSync(file, 'utf8')
      const hasWrapper = /\bwithAuth\b/.test(source)
      if (!hasWrapper) offenders.push(rel)
    }
    expect(offenders, `AI/HEIC routes missing withAuth: ${offenders.join(', ')}`).toEqual([])
  })
})
