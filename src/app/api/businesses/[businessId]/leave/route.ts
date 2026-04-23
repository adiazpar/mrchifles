import { isOwner, invalidateAccessCache } from '@/lib/business-auth'
import { db, businessUsers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { withBusinessAuth, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'

/**
 * POST /api/businesses/[businessId]/leave
 *
 * Leave a business (remove membership).
 * Owners cannot leave - they must transfer ownership or delete the business.
 */
export const POST = withBusinessAuth(async (_request, access) => {
  if (isOwner(access.role)) {
    return errorResponse(ApiMessageCode.BUSINESS_OWNER_CANNOT_LEAVE, 400)
  }

  // Remove membership
  await db
    .delete(businessUsers)
    .where(
      and(
        eq(businessUsers.userId, access.userId),
        eq(businessUsers.businessId, access.businessId)
      )
    )

  // Clear the cached BusinessAccess so the next request from this user
  // against this business can't ride the 60-second TTL window.
  invalidateAccessCache(access.userId, access.businessId)

  return successResponse({}, ApiMessageCode.BUSINESS_LEAVE_SUCCESS)
})
