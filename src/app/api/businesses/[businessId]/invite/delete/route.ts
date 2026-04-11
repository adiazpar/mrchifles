import { db, inviteCodes } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { isOwner } from '@/lib/business-auth'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'

const deleteInviteSchema = z.object({
  id: Schemas.id(),
})

/**
 * POST /api/businesses/[businessId]/invite/delete
 *
 * Delete an invite code.
 */
export const POST = withBusinessAuth(async (request, access) => {
  if (!isOwner(access.role)) {
    return errorResponse(ApiMessageCode.TEAM_FORBIDDEN_NOT_OWNER, 403)
  }

  const body = await request.json()
  const validation = deleteInviteSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { id } = validation.data

  // Delete the invite code (only if it belongs to the same business)
  await db
    .delete(inviteCodes)
    .where(
      and(
        eq(inviteCodes.id, id),
        eq(inviteCodes.businessId, access.businessId)
      )
    )

  return successResponse({})
})
