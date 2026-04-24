import { db, businessUsers, users, inviteCodes } from '@/db'
import { eq, and, gt, sql } from 'drizzle-orm'
import { canManageBusiness, isOwner } from '@/lib/business-auth'
import { withBusinessAuth, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'

/**
 * GET /api/businesses/[businessId]/team
 *
 * Get team members and active invite codes for the business.
 * Restricted to managers (owner + partner) — employees don't need the
 * team roster and surfacing teammate emails to them is an unnecessary
 * data exposure.
 */
export const GET = withBusinessAuth(async (_request, access) => {
  if (!canManageBusiness(access.role)) {
    return errorResponse(ApiMessageCode.FORBIDDEN, 403)
  }

  // Team members via business_users join. 100 is a defensive cap; the
  // target audience has <10 teammates per business.
  const teamMembers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: businessUsers.role,
      status: businessUsers.status,
      createdAt: businessUsers.createdAt,
    })
    .from(businessUsers)
    .innerJoin(users, eq(businessUsers.userId, users.id))
    .where(eq(businessUsers.businessId, access.businessId))
    .limit(100)

  // Get active (unused, non-expired) invite codes if user is owner
  let activeInviteCodes: Array<{
    id: string
    code: string
    role: 'partner' | 'employee'
    expiresAt: Date
  }> = []

  if (isOwner(access.role)) {
    const now = new Date()
    activeInviteCodes = await db
      .select({
        id: inviteCodes.id,
        code: inviteCodes.code,
        role: inviteCodes.role,
        expiresAt: inviteCodes.expiresAt,
      })
      .from(inviteCodes)
      .where(
        and(
          eq(inviteCodes.businessId, access.businessId),
          sql`${inviteCodes.usedBy} IS NULL`,
          gt(inviteCodes.expiresAt, now)
        )
      )
      .limit(100)
  }

  return successResponse({
    teamMembers,
    inviteCodes: activeInviteCodes,
  })
})
