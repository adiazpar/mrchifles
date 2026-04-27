import { db, inviteCodes } from '@/db'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { canManageBusiness } from '@/lib/business-auth'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { isExpiryWithinBounds } from '@/lib/invite-expiry'
import { Schemas } from '@/lib/schemas'

const regenerateInviteSchema = z.object({
  oldCodeId: Schemas.id(),
  newCode: z.string().length(6).toUpperCase(),
  role: z.enum(['partner', 'employee']),
  expiresAt: z.iso.datetime(),
})

/**
 * POST /api/businesses/[businessId]/invite/regenerate
 *
 * Delete old invite code and create a new one.
 */
export const POST = withBusinessAuth(async (request, access) => {
  if (!canManageBusiness(access.role)) {
    return errorResponse(ApiMessageCode.TEAM_FORBIDDEN_NOT_MANAGER, 403)
  }

  const body = await request.json()
  const validation = regenerateInviteSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { oldCodeId, newCode, role, expiresAt } = validation.data

  if (!isExpiryWithinBounds(new Date(expiresAt))) {
    return errorResponse(ApiMessageCode.INVITE_EXPIRY_OUT_OF_RANGE, 400)
  }

  // Delete old code
  await db
    .delete(inviteCodes)
    .where(
      and(
        eq(inviteCodes.id, oldCodeId),
        eq(inviteCodes.businessId, access.businessId)
      )
    )

  // Create new code
  const newCodeId = nanoid()

  await db.insert(inviteCodes).values({
    id: newCodeId,
    businessId: access.businessId,
    code: newCode,
    role,
    expiresAt: new Date(expiresAt),
  })

  return successResponse({ id: newCodeId, code: newCode })
})
