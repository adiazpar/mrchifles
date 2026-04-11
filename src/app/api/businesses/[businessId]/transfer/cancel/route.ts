import { db, ownershipTransfers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { isOwner } from '@/lib/business-auth'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'

const cancelSchema = z.object({
  code: Schemas.code(),
})

/**
 * POST /api/businesses/[businessId]/transfer/cancel
 *
 * Cancel a pending ownership transfer.
 * Only the owner who initiated the transfer can cancel it.
 */
export const POST = withBusinessAuth(async (request, access) => {
  // Only owners can cancel transfers
  if (!isOwner(access.role)) {
    return errorResponse(ApiMessageCode.TRANSFER_FORBIDDEN_NOT_OWNER, 403)
  }

  const body = await request.json()
  const validation = cancelSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { code } = validation.data

  // Find the transfer
  const [transfer] = await db
    .select()
    .from(ownershipTransfers)
    .where(
      and(
        eq(ownershipTransfers.code, code),
        eq(ownershipTransfers.fromUser, access.userId)
      )
    )
    .limit(1)

  if (!transfer) {
    return errorResponse(ApiMessageCode.TRANSFER_NOT_FOUND, 404)
  }

  // Can only cancel pending or accepted transfers
  if (transfer.status !== 'pending' && transfer.status !== 'accepted') {
    return errorResponse(ApiMessageCode.TRANSFER_CANNOT_CANCEL, 400)
  }

  // Update to cancelled
  await db
    .update(ownershipTransfers)
    .set({
      status: 'cancelled',
    })
    .where(eq(ownershipTransfers.id, transfer.id))

  return successResponse({})
})
