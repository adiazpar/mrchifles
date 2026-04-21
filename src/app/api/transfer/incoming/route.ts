import { NextResponse } from 'next/server'
import { db, ownershipTransfers, users, businesses } from '@/db'
import { eq, and, gt } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/simple-auth'
import { errorResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'

/**
 * GET /api/transfer/incoming
 *
 * Fetches any pending incoming ownership transfer for the current user.
 * User-level endpoint for displaying transfer notifications.
 *
 * Returns the transfer with sender info if one exists.
 */
export async function GET() {
  try {
    // Require authentication
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
    }

    // Get current user's email
    const currentUserData = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, user.userId))
      .get()

    if (!currentUserData) {
      return NextResponse.json({
        success: true,
        transfer: null,
      })
    }

    const now = new Date()

    // Find incoming transfer for this user's email
    const transfer = await db
      .select({
        id: ownershipTransfers.id,
        code: ownershipTransfers.code,
        status: ownershipTransfers.status,
        expiresAt: ownershipTransfers.expiresAt,
        businessId: ownershipTransfers.businessId,
        businessName: businesses.name,
        fromUserId: ownershipTransfers.fromUser,
      })
      .from(ownershipTransfers)
      .innerJoin(businesses, eq(ownershipTransfers.businessId, businesses.id))
      .where(
        and(
          eq(ownershipTransfers.toEmail, currentUserData.email.toLowerCase()),
          eq(ownershipTransfers.status, 'pending'),
          gt(ownershipTransfers.expiresAt, now)
        )
      )
      .get()

    if (!transfer) {
      return NextResponse.json({
        success: true,
        transfer: null,
      })
    }

    // Get the from user's name
    const fromUser = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, transfer.fromUserId))
      .get()

    return NextResponse.json({
      success: true,
      transfer: {
        code: transfer.code,
        status: transfer.status,
        expiresAt: transfer.expiresAt.toISOString(),
        business: {
          id: transfer.businessId,
          name: transfer.businessName,
        },
        fromUser: fromUser
          ? { id: fromUser.id, name: fromUser.name }
          : null,
      },
    })
  } catch (error) {
    console.error('Fetch incoming transfer error:', error)
    return errorResponse(ApiMessageCode.TRANSFER_FETCH_INCOMING_FAILED, 500)
  }
}
