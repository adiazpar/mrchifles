import { NextRequest, NextResponse } from 'next/server'
import { db, ownershipTransfers, users } from '@/db'
import { eq, and, gt, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'
import { validationError, errorResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'
import { checkRateLimit, getClientIp, RateLimits } from '@/lib/rate-limit'

const acceptSchema = z.object({
  code: Schemas.code(),
})

/**
 * POST /api/transfer/accept
 *
 * Accepts an ownership transfer by code.
 * User-level endpoint (not business-scoped) because the recipient
 * may not yet have access to the business.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const clientIp = getClientIp(request)
    const rateLimitResult = checkRateLimit(`transfer:${clientIp}`, RateLimits.codeValidation)
    if (!rateLimitResult.success) {
      const retryAfter = String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000))
      const response = errorResponse(ApiMessageCode.TRANSFER_RATE_LIMITED, 429)
      response.headers.set('Retry-After', retryAfter)
      return response
    }

    // Require authentication
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
    }

    const body = await request.json()
    const validation = acceptSchema.safeParse(body)

    if (!validation.success) {
      return validationError(validation)
    }

    const { code } = validation.data
    const now = new Date()

    // Find the transfer
    const transfer = await db
      .select({
        id: ownershipTransfers.id,
        code: ownershipTransfers.code,
        status: ownershipTransfers.status,
        toEmail: ownershipTransfers.toEmail,
        expiresAt: ownershipTransfers.expiresAt,
        businessId: ownershipTransfers.businessId,
      })
      .from(ownershipTransfers)
      .where(
        and(
          eq(ownershipTransfers.code, code),
          inArray(ownershipTransfers.status, ['pending']),
          gt(ownershipTransfers.expiresAt, now)
        )
      )
      .get()

    if (!transfer) {
      // Preserve 200-with-success-false so the client renders the error
      // inline (consistent with /api/invite/join's pattern).
      return NextResponse.json({
        success: false,
        messageCode: ApiMessageCode.TRANSFER_INVALID_OR_EXPIRED,
      })
    }

    // Get current user's email
    const currentUserData = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, user.userId))
      .get()

    if (!currentUserData) {
      return NextResponse.json({
        success: false,
        messageCode: ApiMessageCode.TRANSFER_USER_NOT_FOUND,
      })
    }

    // Verify email matches
    const isRecipient = currentUserData.email.toLowerCase() === transfer.toEmail.toLowerCase()

    if (!isRecipient) {
      return NextResponse.json({
        success: false,
        messageCode: ApiMessageCode.TRANSFER_WRONG_RECIPIENT,
      })
    }

    // Update transfer to accepted
    await db
      .update(ownershipTransfers)
      .set({
        status: 'accepted',
        toUser: user.userId,
        acceptedAt: now,
      })
      .where(eq(ownershipTransfers.id, transfer.id))

    return NextResponse.json({
      success: true,
      businessId: transfer.businessId,
    })
  } catch (error) {
    console.error('Accept transfer error:', error)
    return errorResponse(ApiMessageCode.TRANSFER_ACCEPT_FAILED, 500)
  }
}
