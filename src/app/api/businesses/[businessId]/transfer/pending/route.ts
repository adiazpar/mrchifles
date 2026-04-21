import { db, ownershipTransfers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { isOwner } from '@/lib/business-auth'
import { withBusinessAuth, successResponse } from '@/lib/api-middleware'

/**
 * GET /api/businesses/[businessId]/transfer/pending
 *
 * Get the current user's pending outgoing transfer (for owners).
 * Returns the transfer with recipient info if they've accepted.
 */
export const GET = withBusinessAuth(async (request, access) => {
  // Only owners have outgoing transfers
  if (!isOwner(access.role)) {
    return successResponse({ transfer: null })
  }

  // Find pending transfer from this user
  const [transfer] = await db
    .select()
    .from(ownershipTransfers)
    .where(
      and(
        eq(ownershipTransfers.fromUser, access.userId),
        eq(ownershipTransfers.status, 'pending')
      )
    )
    .limit(1)

  if (!transfer) {
    return successResponse({ transfer: null })
  }

  // Check if expired
  if (transfer.status === 'pending' && new Date(transfer.expiresAt) < new Date()) {
    // Mark as expired
    await db
      .update(ownershipTransfers)
      .set({
        status: 'expired',
      })
      .where(eq(ownershipTransfers.id, transfer.id))

    return successResponse({ transfer: null })
  }

  return successResponse({
    transfer: {
      code: transfer.code,
      toEmail: transfer.toEmail,
      status: 'pending' as const,
      expiresAt: transfer.expiresAt instanceof Date
        ? transfer.expiresAt.toISOString()
        : transfer.expiresAt,
    },
  })
})
