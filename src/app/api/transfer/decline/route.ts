import { NextRequest } from 'next/server'
import { db, ownershipTransfers, users } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'
import { validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'

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
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
    }

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

    const currentUserData = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, user.userId))
      .get()

    if (
      !currentUserData ||
      currentUserData.email.toLowerCase() !== transfer.toEmail.toLowerCase()
    ) {
      return errorResponse(ApiMessageCode.TRANSFER_WRONG_RECIPIENT, 403)
    }

    await db
      .update(ownershipTransfers)
      .set({ status: 'cancelled' })
      .where(eq(ownershipTransfers.id, transfer.id))

    return successResponse({})
  } catch (error) {
    console.error('Decline transfer error:', error)
    return errorResponse(ApiMessageCode.TRANSFER_DECLINE_FAILED, 500)
  }
}
