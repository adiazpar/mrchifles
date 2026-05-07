import 'server-only'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'

// ============================================
// CONFIGURATION
// ============================================

// Cookie name uses the __Host- prefix, a browser-enforced contract
// that requires Secure, Path=/ and disallows the Domain attribute.
// This stops a sibling subdomain from setting/shadowing the auth
// cookie (subdomain-takeover scenario). The legacy `auth-token`
// name is no longer read or written — any session issued under it
// is forcibly invalidated on first request after deploy.
const AUTH_COOKIE_NAME = '__Host-auth-token'
const SALT_ROUNDS = 12
const JWT_EXPIRY = '7d' // 7 days

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

// ============================================
// PASSWORD HASHING
// ============================================

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ============================================
// JWT TOKENS
// ============================================

export interface JWTPayload {
  userId: string
  email: string
  [key: string]: unknown // Required for jose compatibility
}

// Issuer / audience claims pin tokens to this app, so a leaked secret
// shared with another internal service can't produce tokens accepted
// here (and vice versa). All NEW tokens carry both claims; the verifier
// will be tightened to require them in a follow-up after the 7-day
// max session age has elapsed since deploy.
const JWT_ISSUER = 'kasero'
const JWT_AUDIENCE = 'kasero-app'

/**
 * Create a JWT token
 */
export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJwtSecret())
}

/**
 * Verify and decode a JWT token.
 *
 * `algorithms: ['HS256']` pins the signing algorithm: jose with a
 * Uint8Array key already rejects `alg: none`, but without an
 * explicit allowlist it would still accept HS384/HS512 with the same
 * secret — an alg-confusion vector if the secret is ever shared
 * with a service that signs other HS variants.
 *
 * `issuer` and `audience` are required: any token missing or
 * mismatching either claim is rejected. Tokens issued before these
 * claims were added (the ones in the wild prior to the deploy that
 * shipped this check) lack both and are forcibly invalidated — by
 * design, per the "no backwards compatibility" remediation. Users
 * with stale tokens re-login once and the new token carries both
 * claims.
 *
 * `clockTolerance: '5s'` accepts tokens whose `iat`/`exp` are within
 * 5s of the verifier's clock, smoothing minor clock drift between
 * Lambdas without meaningfully widening the validity window.
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      clockTolerance: '5s',
    })
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

// ============================================
// COOKIES
// ============================================

/**
 * Set the auth cookie (server-side)
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    // Always set Secure. The dev server now runs HTTPS via
    // `next dev --experimental-https`, and browsers (especially Chrome on
    // Android with self-signed certs) refuse to persist cookies without
    // the Secure flag on HTTPS origins. This also matches production
    // behavior, which is always HTTPS.
    secure: true,
    // `lax` is sufficient here and avoids edge cases where `strict`
    // causes cookies to not be sent on top-level navigations from
    // external links or PWA launchers.
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null
}

/**
 * Clear the auth cookie (server-side).
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
}

/**
 * Get token from request (for middleware)
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null
}

// ============================================
// SESSION INVALIDATION
// ============================================
//
// Stateless JWTs can't be revoked, but we can record two server-side
// "earliest valid iat" timestamps per user and reject any token whose
// iat predates them:
//
//   - passwordChangedAt — bumped on /api/auth/change-password.
//   - tokensInvalidBefore — bumped on /api/auth/logout (and on
//     disable / removal-for-cause; see Fix 31 / M-21). This is what
//     makes "log out" actually revoke the captured cookie server-
//     side. Without it, a JWT exfiltrated via XSS / extension keeps
//     working for the rest of its 7-day window.
//
// The check runs once per cache miss per user — 60-second in-memory
// cache amortizes the DB cost to ~1 round trip per user per minute.
// On any revocation event we call invalidateUserSession() so the next
// request re-reads both timestamps.

const SESSION_CACHE_TTL_MS = 60_000

interface SessionCacheEntry {
  passwordChangedAtMs: number | null
  tokensInvalidBeforeMs: number | null
  expiresAt: number
}

const sessionCache = new Map<string, SessionCacheEntry>()

async function getRevocationTimestamps(userId: string): Promise<{
  passwordChangedAtMs: number | null
  tokensInvalidBeforeMs: number | null
}> {
  const now = Date.now()
  const cached = sessionCache.get(userId)
  if (cached && cached.expiresAt > now) {
    return {
      passwordChangedAtMs: cached.passwordChangedAtMs,
      tokensInvalidBeforeMs: cached.tokensInvalidBeforeMs,
    }
  }
  const [row] = await db
    .select({
      passwordChangedAt: users.passwordChangedAt,
      tokensInvalidBefore: users.tokensInvalidBefore,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const passwordChangedAtMs = row?.passwordChangedAt
    ? new Date(row.passwordChangedAt).getTime()
    : null
  const tokensInvalidBeforeMs = row?.tokensInvalidBefore
    ? new Date(row.tokensInvalidBefore).getTime()
    : null
  sessionCache.set(userId, {
    passwordChangedAtMs,
    tokensInvalidBeforeMs,
    expiresAt: now + SESSION_CACHE_TTL_MS,
  })
  return { passwordChangedAtMs, tokensInvalidBeforeMs }
}

/**
 * Drop the session-cache entry for a user so the next getCurrentUser
 * call re-fetches both revocation timestamps. Call from change-password,
 * logout, disable, and any future "log me out everywhere" path.
 */
export function invalidateUserSession(userId: string): void {
  sessionCache.delete(userId)
}

/**
 * Server-side logout revocation. Bumps the user's tokensInvalidBefore
 * timestamp and flushes the session cache so any JWT issued before
 * `now` (including the cookie that was just cleared from the browser
 * AND any copy an attacker has exfiltrated) is rejected on next
 * request. Idempotent — calling for an already-deleted user is a
 * no-op.
 */
export async function revokeUserTokens(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ tokensInvalidBefore: new Date() })
    .where(eq(users.id, userId))
  invalidateUserSession(userId)
}

// ============================================
// SESSION HELPERS
// ============================================

/**
 * Get the current user from the auth cookie (server-side).
 * Also enforces post-password-change JWT invalidation: any token whose
 * iat predates the user's stored passwordChangedAt is treated as
 * logged out.
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getAuthCookie()
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload) return null

  // Standard JWT iat claim is seconds-since-epoch. We compare it
  // against TWO revocation timestamps and reject the token if it
  // predates either: passwordChangedAt (bumped on change-password)
  // and tokensInvalidBefore (bumped on logout / disable). Both
  // checks short-circuit cleanly when the corresponding column is
  // null (user has never changed password / never logged out).
  //
  // Audit M-4: a missing `iat` is treated as INVALID (return null).
  // The previous implementation accepted iat-less tokens, which
  // bypassed both revocation checks. createToken always sets iat
  // via setIssuedAt(), so any token reaching here without it is
  // either malformed or a hand-crafted forgery — neither should
  // authorize access.
  const iat = typeof payload.iat === 'number' ? payload.iat : null
  if (iat === null) return null
  const iatMs = iat * 1000
  const { passwordChangedAtMs, tokensInvalidBeforeMs } =
    await getRevocationTimestamps(payload.userId)
  if (passwordChangedAtMs !== null && passwordChangedAtMs > iatMs) {
    return null
  }
  if (tokensInvalidBeforeMs !== null && tokensInvalidBeforeMs > iatMs) {
    return null
  }
  return payload
}

/**
 * Verify user is authenticated, throw if not
 */
export async function requireAuth(): Promise<JWTPayload> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}


