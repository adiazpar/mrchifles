import { db, businessUsers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { canManageBusiness, invalidateAccessCache } from '@/lib/business-auth'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'

const toggleStatusSchema = z.object({
  userId: Schemas.id(),
  status: z.enum(['active', 'disabled']),
})

/**
 * POST /api/businesses/[businessId]/users/toggle-status
 *
 * Toggle user active/disabled status.
 * Only owners can toggle status, and they can't toggle their own status.
 */
export const POST = withBusinessAuth(async (request, access) => {
  if (!canManageBusiness(access.role)) {
    return errorResponse(ApiMessageCode.TEAM_FORBIDDEN_NOT_MANAGER, 403)
  }

  const body = await request.json()
  const validation = toggleStatusSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { userId, status } = validation.data

  // Can't toggle own status
  if (userId === access.userId) {
    return errorResponse(ApiMessageCode.TEAM_CANNOT_CHANGE_OWN_STATUS, 400)
  }

  // Fetch target's membership to get their role
  const [targetMembership] = await db
    .select({ role: businessUsers.role })
    .from(businessUsers)
    .where(
      and(
        eq(businessUsers.userId, userId),
        eq(businessUsers.businessId, access.businessId)
      )
    )
    .limit(1)

  if (!targetMembership) {
    return errorResponse(ApiMessageCode.BUSINESS_NOT_FOUND, 404)
  }

  // Partner-on-partner guard: a partner cannot toggle another partner's
  // status. Only the owner can manage partners. Employees cannot reach
  // this route at all (gated above).
  if (access.role === 'partner' && targetMembership.role === 'partner') {
    return errorResponse(ApiMessageCode.TEAM_PARTNER_CANNOT_MUTATE_PARTNER, 403)
  }

  // Update user status in business_users
  await db
    .update(businessUsers)
    .set({
      status,
    })
    .where(
      and(
        eq(businessUsers.userId, userId),
        eq(businessUsers.businessId, access.businessId)
      )
    )

  invalidateAccessCache(userId, access.businessId)

  return successResponse({})
})
