import { NextRequest, NextResponse } from 'next/server'
import { db, inviteCodes, businesses, ownershipTransfers, users } from '@/db'
import { eq, and, gt, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'
import { validationError, errorResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'
import { checkRateLimit, getClientIp, RateLimits } from '@/lib/rate-limit'

const validateSchema = z.object({
  code: Schemas.code(),
})

/**
 * POST /api/invite/validate
 *
 * Validates an invite code OR transfer code and returns business info.
 * Requires authentication - user must be logged in.
 *
 * Returns:
 * - type: 'invite' | 'transfer'
 * - For invites: business info, role
 * - For transfers: business info, from user info, status
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const clientIp = getClientIp(request)
    const rateLimitResult = checkRateLimit(`validate:${clientIp}`, RateLimits.codeValidation)
    if (!rateLimitResult.success) {
      const retryAfter = String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000))
      const response = NextResponse.json(
        {
          valid: false,
          messageCode: ApiMessageCode.INVITE_RATE_LIMITED,
        },
        { status: 429 },
      )
      response.headers.set('Retry-After', retryAfter)
      return response
    }

    // Require authentication
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
    }

    const body = await request.json()
    const validation = validateSchema.safeParse(body)

    if (!validation.success) {
      return validationError(validation)
    }

    const { code } = validation.data
    const now = new Date()

    // First, try to find as invite code (6 chars)
    const invite = await db
      .select({
        id: inviteCodes.id,
        code: inviteCodes.code,
        role: inviteCodes.role,
        expiresAt: inviteCodes.expiresAt,
        businessId: inviteCodes.businessId,
        businessName: businesses.name,
      })
      .from(inviteCodes)
      .innerJoin(businesses, eq(inviteCodes.businessId, businesses.id))
      .where(
        and(
          eq(inviteCodes.code, code),
          sql`${inviteCodes.usedBy} IS NULL`,
          gt(inviteCodes.expiresAt, now)
        )
      )
      .get()

    if (invite) {
      return NextResponse.json({
        valid: true,
        type: 'invite',
        business: {
          id: invite.businessId,
          name: invite.businessName,
        },
        role: invite.role,
      })
    }

    // Next, try to find as transfer code (8 chars)
    const transfer = await db
      .select({
        id: ownershipTransfers.id,
        code: ownershipTransfers.code,
        status: ownershipTransfers.status,
        toEmail: ownershipTransfers.toEmail,
        expiresAt: ownershipTransfers.expiresAt,
        businessId: ownershipTransfers.businessId,
        businessName: businesses.name,
        fromUserId: ownershipTransfers.fromUser,
      })
      .from(ownershipTransfers)
      .innerJoin(businesses, eq(ownershipTransfers.businessId, businesses.id))
      .where(
        and(
          eq(ownershipTransfers.code, code),
          inArray(ownershipTransfers.status, ['pending', 'accepted']),
          gt(ownershipTransfers.expiresAt, now)
        )
      )
      .get()

    if (transfer) {
      // Get the from user's name. The current user's email comes from
      // the JWT; no need to re-query the DB just to read it.
      const fromUser = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, transfer.fromUserId))
        .get()

      const isRecipient = user.email.toLowerCase() === transfer.toEmail.toLowerCase()

      if (!isRecipient) {
        return NextResponse.json({
          valid: false,
          messageCode: ApiMessageCode.INVITE_WRONG_RECIPIENT,
        })
      }

      return NextResponse.json({
        valid: true,
        type: 'transfer',
        business: {
          id: transfer.businessId,
          name: transfer.businessName,
        },
        fromUser: {
          name: fromUser?.name || 'Unknown',
        },
        status: transfer.status,
      })
    }

    // No valid code found. 200 with valid:false so client renders inline.
    return NextResponse.json({
      valid: false,
      messageCode: ApiMessageCode.INVITE_INVALID_OR_EXPIRED,
    })
  } catch (error) {
    console.error('Validate code error:', error)
    return NextResponse.json(
      {
        valid: false,
        messageCode: ApiMessageCode.INVITE_VALIDATE_FAILED,
      },
      { status: 500 },
    )
  }
}
