import { NextRequest, NextResponse } from 'next/server'
import { db, ownershipTransfers, users, businesses } from '@/db'
// `users` is kept because the fromUser name fetch below still needs it.
import { eq, and, gt } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { errorResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { logServerError } from '@/lib/server-logger'

/**
 * GET /api/transfer/incoming
 *
 * Fetches any pending incoming ownership transfer for the current user.
 * User-level endpoint for displaying transfer notifications.
 *
 * Returns the transfer with sender info if one exists.
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
    }
    if (!session.user.emailVerified) {
      return errorResponse(ApiMessageCode.EMAIL_NOT_VERIFIED, 403)
    }

    const now = new Date()

    // Find incoming transfer for this user's email. The session already
    // carries session.user.email, so we skip the pre-flight DB lookup the
    // old code did — one round trip saved per hub-home render.
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
          eq(ownershipTransfers.toEmail, session.user.email.toLowerCase()),
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
    logServerError('transfer.incoming', error)
    return errorResponse(ApiMessageCode.TRANSFER_FETCH_INCOMING_FAILED, 500)
  }
}
