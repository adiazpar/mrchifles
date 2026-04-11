/**
 * Edge-runtime-safe auth helpers. This module is imported by middleware.ts
 * which runs in Next.js's Edge Runtime, so it must not pull in Node-only
 * dependencies (bcryptjs, next/headers, etc.).
 *
 * Server-side API routes should import from `@/lib/simple-auth` instead,
 * which exposes the full auth surface including password hashing and
 * cookie helpers.
 */

import { jwtVerify } from 'jose/jwt/verify'
import type { NextRequest } from 'next/server'

const AUTH_COOKIE_NAME = 'auth-token'

export interface JWTPayload {
  userId: string
  email: string
  [key: string]: unknown
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Verify and decode a JWT token. Edge-safe.
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

/**
 * Extract the auth token from a NextRequest's cookies. Edge-safe.
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null
}
