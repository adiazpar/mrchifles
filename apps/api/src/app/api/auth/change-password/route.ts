import { NextRequest } from 'next/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  getCurrentUser,
  verifyPassword,
  hashPassword,
  invalidateUserSession,
} from '@/lib/simple-auth'
import { validationError, errorResponse, successResponse, applyRateLimit, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { Schemas } from '@/lib/schemas'
import { getClientIp, RateLimits } from '@/lib/rate-limit'
import { logServerError } from '@/lib/server-logger'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: Schemas.password(),
})

/**
 * POST /api/auth/change-password
 *
 * Change the authenticated user's password. Requires the current
 * password for confirmation. New password is validated with the same
 * Schemas.password() rules as registration (8+ chars, uppercase,
 * number). Rate limited per IP on the same bucket as login to make
 * credential-stuffing attempts expensive.
 */
// 8 KB easily covers two passwords + JSON envelope; bigger bodies
// don't represent a legitimate password input.
const MAX_BODY_BYTES = 8 * 1024

export async function POST(request: NextRequest) {
  try {
    const oversize = enforceMaxContentLength(request, MAX_BODY_BYTES)
    if (oversize) return oversize
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return errorResponse(ApiMessageCode.VALIDATION_GENERIC, 400)
    }

    const session = await getCurrentUser()
    if (!session) {
      return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
    }

    // Reuses the login limiter shape (5/15min/IP, fail-closed). If
    // Upstash is unreachable the helper returns 503 instead of
    // letting password-change brute-force ride a per-Lambda counter.
    const clientIp = getClientIp(request)
    const limited = await applyRateLimit(
      `change-password:${clientIp}`,
      RateLimits.login,
      ApiMessageCode.AUTH_LOGIN_RATE_LIMITED,
    )
    if (limited) return limited

    const body = await request.json()
    const validation = changePasswordSchema.safeParse(body)
    if (!validation.success) {
      return validationError(validation)
    }

    const { currentPassword, newPassword } = validation.data

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    if (!user) {
      return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
    }

    const isValidCurrent = await verifyPassword(currentPassword, user.password)
    if (!isValidCurrent) {
      return errorResponse(ApiMessageCode.USER_INCORRECT_CURRENT_PASSWORD, 401)
    }

    if (currentPassword === newPassword) {
      return errorResponse(ApiMessageCode.USER_NEW_PASSWORD_SAME_AS_OLD, 400)
    }

    const newHash = await hashPassword(newPassword)

    // Stamp passwordChangedAt so any JWT issued before now is rejected
    // on its next server-side verify. The old cookie is still in the
    // caller's browser — they stay logged in on this tab because the
    // response doesn't re-issue, so we also let them ride the existing
    // session. Tokens on OTHER devices / tabs (same account, stale
    // cookie) will fail their next getCurrentUser().
    const now = new Date()
    await db
      .update(users)
      .set({ password: newHash, passwordChangedAt: now })
      .where(eq(users.id, session.userId))

    // Drop the cached passwordChangedAt so the invalidation takes
    // effect on the next request instead of up to 60 seconds later.
    invalidateUserSession(session.userId)

    return successResponse({}, ApiMessageCode.USER_PASSWORD_CHANGED)
  } catch (error) {
    logServerError('auth.change-password', error)
    return errorResponse(ApiMessageCode.USER_PASSWORD_CHANGE_FAILED, 500)
  }
}
