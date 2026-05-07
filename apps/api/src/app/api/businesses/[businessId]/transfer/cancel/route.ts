import { db, ownershipTransfers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { isOwner } from '@/lib/business-auth'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
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

  // Find the transfer (existence + sender check). The status field is
  // intentionally NOT checked here — a separate read+check leaves a
  // TOCTOU window where the recipient calls /accept between the SELECT
  // (status='pending') and the UPDATE, and the UPDATE then overwrites
  // status='completed' with 'cancelled', corrupting bookkeeping while
  // the role swap stays committed. The atomic claim below is the
  // single source of truth for the status flip.
  const [transfer] = await db
    .select({ id: ownershipTransfers.id })
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

  // Atomic claim: only succeed if the transfer is still pending. If
  // /accept committed first, status is already 'completed' and this
  // UPDATE matches zero rows — return CANNOT_CANCEL instead of silently
  // overwriting completed state.
  const cancelled = await db
    .update(ownershipTransfers)
    .set({ status: 'cancelled' })
    .where(
      and(
        eq(ownershipTransfers.id, transfer.id),
        eq(ownershipTransfers.status, 'pending'),
      ),
    )
    .returning({ id: ownershipTransfers.id })

  if (cancelled.length === 0) {
    return errorResponse(ApiMessageCode.TRANSFER_CANNOT_CANCEL, 400)
  }

  return successResponse({})
})
