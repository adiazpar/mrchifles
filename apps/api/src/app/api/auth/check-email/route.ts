import { NextRequest } from 'next/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logServerError } from '@/lib/server-logger'
import {
  validationError,
  errorResponse,
  successResponse,
  applyRateLimit,
  enforceMaxContentLength,
} from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { Schemas } from '@/lib/schemas'
import { getClientIp, RateLimits } from '@/lib/rate-limit'

const checkEmailSchema = z.object({
  email: Schemas.email(),
})

const MAX_BODY_BYTES = 16 * 1024

/**
 * POST /api/auth/check-email
 *
 * Pre-flight existence check used by the registration wizard's step 2.
 * Returns AUTH_EMAIL_AVAILABLE if the address is free, AUTH_EMAIL_TAKEN
 * if it already belongs to a user. The authoritative collision check
 * remains in /api/auth/register; this route exists so the user can fix a
 * taken email on the step where it was entered, not at submit time.
 */
export async function POST(request: NextRequest) {
  try {
    const oversize = enforceMaxContentLength(request, MAX_BODY_BYTES)
    if (oversize) return oversize
    if (
      !request.headers
        .get('content-type')
        ?.toLowerCase()
        .startsWith('application/json')
    ) {
      return errorResponse(ApiMessageCode.VALIDATION_GENERIC, 400)
    }

    const clientIp = getClientIp(request)
    const limited = await applyRateLimit(
      `checkEmail:${clientIp}`,
      RateLimits.checkEmail,
      ApiMessageCode.AUTH_CHECK_EMAIL_RATE_LIMITED,
    )
    if (limited) return limited

    const body = await request.json()
    const validation = checkEmailSchema.safeParse(body)
    if (!validation.success) {
      return validationError(validation)
    }

    const { email } = validation.data

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .get()

    if (existing) {
      return errorResponse(ApiMessageCode.AUTH_EMAIL_TAKEN, 400)
    }

    return successResponse({}, ApiMessageCode.AUTH_EMAIL_AVAILABLE)
  } catch (error) {
    logServerError('auth.check-email', error)
    return errorResponse(ApiMessageCode.AUTH_CHECK_EMAIL_FAILED, 500)
  }
}
