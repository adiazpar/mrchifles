import { db, businessUsers, users, inviteCodes } from '@/db'
import { eq, and, gt, sql } from 'drizzle-orm'
import { canManageBusiness } from '@/lib/business-auth'
import { withBusinessAuth, successResponse } from '@/lib/api-middleware'

/**
 * GET /api/businesses/[businessId]/team
 *
 * Read-only team view. Available to any active member of the business.
 *
 * Response shape varies by caller role:
 *   - Owner / partner ("manager"): full payload — every member's email is
 *     included, plus active invite codes.
 *   - Employee: roster without emails, no invite codes. Employees have
 *     no need to act on their teammates' email addresses, and the route's
 *     prior author called this out as an unnecessary data exposure.
 */
export const GET = withBusinessAuth(async (_request, access) => {
  const isManager = canManageBusiness(access.role)

  // Defensive cap of 100 — the target audience has <10 teammates per business.
  const allMembers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatar: users.avatar,
      role: businessUsers.role,
      status: businessUsers.status,
      createdAt: businessUsers.createdAt,
    })
    .from(businessUsers)
    .innerJoin(users, eq(businessUsers.userId, users.id))
    .where(eq(businessUsers.businessId, access.businessId))
    .limit(100)

  // Employee-facing payload omits the email field entirely. We strip it
  // from each row rather than running a different SELECT to keep the
  // query plan stable across roles.
  const teamMembers = isManager
    ? allMembers
    : allMembers.map(({ email: _email, ...rest }) => rest)

  // Active (unused, non-expired) invite codes are visible to managers only.
  let activeInviteCodes: Array<{
    id: string
    code: string
    role: 'partner' | 'employee'
    expiresAt: Date
  }> = []

  if (isManager) {
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
