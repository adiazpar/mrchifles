import { NextRequest, NextResponse } from 'next/server'
import { db, ownershipTransfers, businessUsers } from '@/db'
import { eq, and, gt, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { getCurrentUser } from '@/lib/simple-auth'
import { validationError, errorResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'
import { checkRateLimit, getClientIp, RateLimits } from '@/lib/rate-limit'
import { invalidateAccessCache } from '@/lib/business-auth'

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
        fromUser: ownershipTransfers.fromUser,
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

    // The JWT already carries the user's email — trust it and skip the DB
    // round trip. If the token is stale (user deleted mid-session) the
    // transaction below would fail on the FK insert anyway.
    const isRecipient = user.email.toLowerCase() === transfer.toEmail.toLowerCase()

    if (!isRecipient) {
      return NextResponse.json({
        success: false,
        messageCode: ApiMessageCode.TRANSFER_WRONG_RECIPIENT,
      })
    }

    // Atomic: demote old owner, promote recipient, mark transfer completed
    await db.transaction(async (tx) => {
      // Demote old owner to partner
      await tx
        .update(businessUsers)
        .set({ role: 'partner' })
        .where(and(
          eq(businessUsers.userId, transfer.fromUser),
          eq(businessUsers.businessId, transfer.businessId),
        ))

      // Upsert recipient as owner
      const [existingMembership] = await tx
        .select()
        .from(businessUsers)
        .where(and(
          eq(businessUsers.userId, user.userId),
          eq(businessUsers.businessId, transfer.businessId),
        ))
        .limit(1)

      if (existingMembership) {
        await tx
          .update(businessUsers)
          .set({ role: 'owner', status: 'active' })
          .where(eq(businessUsers.id, existingMembership.id))
      } else {
        await tx.insert(businessUsers).values({
          id: nanoid(),
          userId: user.userId,
          businessId: transfer.businessId,
          role: 'owner',
          status: 'active',
          createdAt: now,
        })
      }

      await tx
        .update(ownershipTransfers)
        .set({
          status: 'completed',
          toUser: user.userId,
        })
        .where(eq(ownershipTransfers.id, transfer.id))
    })

    // Invalidate cached access
    invalidateAccessCache(transfer.fromUser, transfer.businessId)
    invalidateAccessCache(user.userId, transfer.businessId)

    return NextResponse.json({
      success: true,
      businessId: transfer.businessId,
    })
  } catch (error) {
    console.error('Accept transfer error:', error)
    return errorResponse(ApiMessageCode.TRANSFER_ACCEPT_FAILED, 500)
  }
}
