import { NextRequest } from 'next/server'
import { db, ownershipTransfers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'
import { validationError, errorResponse, successResponse, applyRateLimit, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { Schemas } from '@/lib/schemas'
import { RateLimits } from '@/lib/rate-limit'
import { logServerError } from '@/lib/server-logger'

const declineSchema = z.object({
  code: Schemas.code(),
})

/**
 * POST /api/transfer/decline
 *
 * User-level endpoint. Allows the recipient of an ownership transfer to
 * decline it. Mirrors /api/transfer/accept but moves the transfer to
 * 'cancelled' status instead of 'accepted'.
 *
 * Only the user whose email matches transfer.toEmail can decline.
 * Already-completed or already-cancelled transfers return the usual
 * TRANSFER_INVALID_OR_EXPIRED code.
 */
const MAX_BODY_BYTES = 1024

export async function POST(request: NextRequest) {
  try {
    const oversize = enforceMaxContentLength(request, MAX_BODY_BYTES)
    if (oversize) return oversize

    const user = await getCurrentUser()
    if (!user) {
      return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
    }

    // Transfer codes are 6 chars; /accept is already rate-limited, and
    // /decline is too — without this cap an attacker with a valid code
    // could flip pending transfers to cancelled at will.
    const rateLimited = await applyRateLimit(
      `transfer-decline:${user.userId}`,
      RateLimits.userMutation,
    )
    if (rateLimited) return rateLimited

    const body = await request.json()
    const validation = declineSchema.safeParse(body)
    if (!validation.success) {
      return validationError(validation)
    }

    const { code } = validation.data

    const transfer = await db
      .select({
        id: ownershipTransfers.id,
        toEmail: ownershipTransfers.toEmail,
      })
      .from(ownershipTransfers)
      .where(
        and(
          eq(ownershipTransfers.code, code),
          eq(ownershipTransfers.status, 'pending'),
        ),
      )
      .get()

    if (!transfer) {
      return errorResponse(ApiMessageCode.TRANSFER_INVALID_OR_EXPIRED, 400)
    }

    // JWT already has the email — no DB round trip needed for this check.
    if (user.email.toLowerCase() !== transfer.toEmail.toLowerCase()) {
      return errorResponse(ApiMessageCode.TRANSFER_WRONG_RECIPIENT, 403)
    }

    // Atomic claim: same TOCTOU rationale as cancel. If /accept lands
    // between the SELECT above and this UPDATE, status is already
    // 'completed' and we must NOT overwrite it with 'cancelled'.
    const declined = await db
      .update(ownershipTransfers)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(ownershipTransfers.id, transfer.id),
          eq(ownershipTransfers.status, 'pending'),
        ),
      )
      .returning({ id: ownershipTransfers.id })

    if (declined.length === 0) {
      return errorResponse(ApiMessageCode.TRANSFER_INVALID_OR_EXPIRED, 400)
    }

    return successResponse({})
  } catch (error) {
    logServerError('transfer.decline', error)
    return errorResponse(ApiMessageCode.TRANSFER_DECLINE_FAILED, 500)
  }
}
