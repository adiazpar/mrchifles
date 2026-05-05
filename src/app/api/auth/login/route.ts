import { NextRequest } from 'next/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { verifyPassword, createToken, setAuthCookie } from '@/lib/simple-auth'
import { logServerError } from '@/lib/server-logger'
import { validationError, errorResponse, successResponse, applyRateLimit, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'
import { getClientIp, RateLimits } from '@/lib/rate-limit'
import { setLocaleCookieServer } from '@/lib/locale-cookie'

const loginSchema = z.object({
  email: Schemas.email(),
  password: z.string().min(1),
})

/**
 * POST /api/auth/login
 *
 * Login with email and password
 */
// 8 KB is plenty for { email, password } — keeps the parser pre-rate-
// limit cheap so an attacker can't shovel multi-MB JSON into auth.
const MAX_BODY_BYTES = 8 * 1024

export async function POST(request: NextRequest) {
  try {
    // Reject obviously-bogus requests before any auth work — multi-MB
    // bodies, non-JSON Content-Types — so an attacker can't drive
    // Lambda CPU/memory by spamming the rate-limited entry point.
    const oversize = enforceMaxContentLength(request, MAX_BODY_BYTES)
    if (oversize) return oversize
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return errorResponse(ApiMessageCode.VALIDATION_GENERIC, 400)
    }

    // Rate limit by IP. applyRateLimit handles fail-closed: if
    // Upstash is unreachable on this auth-critical limiter, it
    // returns a 503 (RATE_LIMITER_UNAVAILABLE) instead of silently
    // falling back to per-Lambda in-memory counters.
    const clientIp = getClientIp(request)
    const ipLimited = await applyRateLimit(
      `login:${clientIp}`,
      RateLimits.login,
      ApiMessageCode.AUTH_LOGIN_RATE_LIMITED,
    )
    if (ipLimited) return ipLimited

    const body = await request.json()
    const validation = loginSchema.safeParse(body)

    if (!validation.success) {
      return validationError(validation)
    }

    const { email, password } = validation.data

    // Per-email rate limit, layered on top of the per-IP cap above.
    // Without this, a credential-stuffing attacker who rotates IPs
    // (botnet, residential proxies, IPv6 /64) bypasses the only
    // brake on guessing one specific victim's password. Keyed on
    // the normalized lowercase email (Schemas.email() lowercases on
    // parse) so case variants share a counter.
    const emailLimited = await applyRateLimit(
      `login-email:${email}`,
      RateLimits.loginEmail,
      ApiMessageCode.AUTH_LOGIN_RATE_LIMITED,
    )
    if (emailLimited) return emailLimited

    // Find user by email (email is already normalized to lowercase by schema)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      return errorResponse(ApiMessageCode.AUTH_INVALID_CREDENTIALS, 401)
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)

    if (!isValidPassword) {
      return errorResponse(ApiMessageCode.AUTH_INVALID_CREDENTIALS, 401)
    }

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
    })

    // Set auth cookie
    await setAuthCookie(token)

    // Set UI language cookie from user preference
    await setLocaleCookieServer(user.language)

    // Return user (without password)
    const { password: _, ...userWithoutPassword } = user

    return successResponse(
      { user: userWithoutPassword },
      ApiMessageCode.AUTH_LOGIN_SUCCESS
    )
  } catch (error) {
    logServerError('auth.login', error)
    return errorResponse(ApiMessageCode.AUTH_LOGIN_FAILED, 500)
  }
}
