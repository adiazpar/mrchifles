import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'

// ============================================
// CONFIGURATION
// ============================================

const AUTH_COOKIE_NAME = 'auth-token'
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

/**
 * Create a JWT token
 */
export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJwtSecret())
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
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
 * Clear the auth cookie (server-side)
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
// Stateless JWTs can't be revoked, but we can record the moment a
// user's password last changed and reject any token whose iat (issued
// at) is older. The check runs once per cache miss per user — 60-second
// in-memory cache amortizes the DB cost to ~1 round trip per user per
// minute. On password change we call invalidateUserSession() so the
// next request re-reads passwordChangedAt and rejects old tokens.

const SESSION_CACHE_TTL_MS = 60_000

interface SessionCacheEntry {
  passwordChangedAtMs: number | null
  expiresAt: number
}

const sessionCache = new Map<string, SessionCacheEntry>()

async function getPasswordChangedAtMs(userId: string): Promise<number | null> {
  const now = Date.now()
  const cached = sessionCache.get(userId)
  if (cached && cached.expiresAt > now) {
    return cached.passwordChangedAtMs
  }
  const [row] = await db
    .select({ passwordChangedAt: users.passwordChangedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const passwordChangedAtMs = row?.passwordChangedAt
    ? new Date(row.passwordChangedAt).getTime()
    : null
  sessionCache.set(userId, {
    passwordChangedAtMs,
    expiresAt: now + SESSION_CACHE_TTL_MS,
  })
  return passwordChangedAtMs
}

/**
 * Drop the session-cache entry for a user so the next getCurrentUser
 * call re-fetches passwordChangedAt. Call from change-password (or any
 * future "log me out everywhere" path).
 */
export function invalidateUserSession(userId: string): void {
  sessionCache.delete(userId)
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

  // Standard JWT iat claim is seconds-since-epoch. If the user changed
  // their password after this token was issued, treat it as revoked.
  const iat = typeof payload.iat === 'number' ? payload.iat : null
  if (iat === null) return payload
  const passwordChangedAtMs = await getPasswordChangedAtMs(payload.userId)
  if (passwordChangedAtMs !== null && passwordChangedAtMs > iat * 1000) {
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


