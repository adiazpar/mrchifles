import { NextRequest, NextResponse } from 'next/server'
import { db, ownershipTransfers, users } from '@/db'
import { eq, and, gt, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'
import { validationError } from '@/lib/api-middleware'
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
 *
 * - Validates the transfer code
 * - Verifies recipient email matches current user
 * - Updates transfer status to 'accepted'
 * - Links the transfer to the current user
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const clientIp = getClientIp(request)
    const rateLimitResult = checkRateLimit(`transfer:${clientIp}`, RateLimits.codeValidation)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please try again later.' },
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
      return NextResponse.json({
        success: false,
        error: 'Invalid, expired, or already accepted transfer code',
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
        error: 'User not found',
      })
    }

    // Verify email matches
    const isRecipient = currentUserData.email.toLowerCase() === transfer.toEmail.toLowerCase()

    if (!isRecipient) {
      return NextResponse.json({
        success: false,
        error: 'This transfer is for a different email address',
      })
    }

    // Update transfer to accepted
    await db
      .update(ownershipTransfers)
      .set({
        status: 'accepted',
        toUser: user.userId,
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(ownershipTransfers.id, transfer.id))

    return NextResponse.json({
      success: true,
      businessId: transfer.businessId,
    })
  } catch (error) {
    console.error('Accept transfer error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to accept transfer' },
      { status: 500 }
    )
  }
}
