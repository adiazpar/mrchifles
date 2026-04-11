import { db, businessUsers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { isOwner, invalidateAccessCache } from '@/lib/business-auth'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'

const changeRoleSchema = z.object({
  userId: Schemas.id(),
  role: Schemas.role().exclude(['owner']),
})

/**
 * POST /api/businesses/[businessId]/users/change-role
 *
 * Change user role (partner/employee).
 * Only owners can change roles, and they can't change another owner's role.
 */
export const POST = withBusinessAuth(async (request, access) => {
  if (!isOwner(access.role)) {
    return errorResponse(ApiMessageCode.TEAM_FORBIDDEN_NOT_OWNER, 403)
  }

  const body = await request.json()
  const validation = changeRoleSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { userId, role } = validation.data

  // Can't change own role
  if (userId === access.userId) {
    return errorResponse(ApiMessageCode.TEAM_CANNOT_CHANGE_OWN_ROLE, 400)
  }

  // Get target user's business membership
  const [targetMembership] = await db
    .select()
    .from(businessUsers)
    .where(
      and(
        eq(businessUsers.userId, userId),
        eq(businessUsers.businessId, access.businessId)
      )
    )
    .limit(1)

  if (!targetMembership) {
    return errorResponse(ApiMessageCode.TEAM_USER_NOT_FOUND, 404)
  }

  if (targetMembership.role === 'owner') {
    return errorResponse(ApiMessageCode.TEAM_CANNOT_CHANGE_OWNER_ROLE, 400)
  }

  // Update user role in business_users
  await db
    .update(businessUsers)
    .set({
      role,
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
