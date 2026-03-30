import { NextRequest, NextResponse } from 'next/server'
import { db, inviteCodes, businesses, ownershipTransfers, users } from '@/db'
import { eq, and, gt, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'
import { validationError } from '@/lib/api-middleware'
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
      return NextResponse.json(
        { valid: false, error: 'Too many validation attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    // Require authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
        used: inviteCodes.used,
        expiresAt: inviteCodes.expiresAt,
        businessId: inviteCodes.businessId,
        businessName: businesses.name,
      })
      .from(inviteCodes)
      .innerJoin(businesses, eq(inviteCodes.businessId, businesses.id))
      .where(
        and(
          eq(inviteCodes.code, code),
          eq(inviteCodes.used, false),
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
      // Get the from user's name
      const fromUser = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, transfer.fromUserId))
        .get()

      // Check if the current user's email matches the transfer recipient
      // We need to get the user's email from the database
      const currentUserData = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, user.userId))
        .get()

      const isRecipient = currentUserData?.email.toLowerCase() === transfer.toEmail.toLowerCase()

      if (!isRecipient) {
        return NextResponse.json({
          valid: false,
          error: 'This transfer is for a different email address',
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

    // No valid code found
    return NextResponse.json({
      valid: false,
      error: 'Invalid or expired code',
    })
  } catch (error) {
    console.error('Validate code error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate code' },
      { status: 500 }
    )
  }
}
