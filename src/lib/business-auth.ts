import { db, businessUsers, businesses, users } from '@/db'
import { eq, and } from 'drizzle-orm'
import { getCurrentUser } from './simple-auth'

// Re-export client-safe utilities for backwards compatibility
export { isOwner, canManageBusiness } from './business-role'
import type { BusinessRole } from './business-role'
export type { BusinessRole }

export interface BusinessAccess {
  businessId: string
  businessName: string
  role: BusinessRole
  userId: string
}

/**
 * Validate that a user has access to a specific business.
 * Returns the user's role and business info, or null if no access.
 *
 * Checks business_users table first, then falls back to legacy user.businessId
 * for backwards compatibility during migration.
 */
export async function validateBusinessAccess(
  userId: string,
  businessId: string
): Promise<BusinessAccess | null> {
  // First, check business_users table
  const [membership] = await db
    .select({
      businessId: businessUsers.businessId,
      role: businessUsers.role,
      status: businessUsers.status,
      businessName: businesses.name,
    })
    .from(businessUsers)
    .innerJoin(businesses, eq(businessUsers.businessId, businesses.id))
    .where(
      and(
        eq(businessUsers.userId, userId),
        eq(businessUsers.businessId, businessId),
        eq(businessUsers.status, 'active')
      )
    )
    .limit(1)

  if (membership) {
    return {
      businessId: membership.businessId,
      businessName: membership.businessName,
      role: membership.role as BusinessRole,
      userId,
    }
  }

  // Fallback: Check legacy user.businessId for backwards compatibility
  const [user] = await db
    .select({
      userId: users.id,
      role: users.role,
      status: users.status,
      businessId: users.businessId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user || user.businessId !== businessId || user.status !== 'active') {
    return null
  }

  // Get business name
  const [business] = await db
    .select({ name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)

  if (!business) {
    return null
  }

  return {
    businessId,
    businessName: business.name,
    role: user.role as BusinessRole,
    userId,
  }
}

/**
 * Get business access from current session and businessId.
 * Convenience wrapper that combines getCurrentUser + validateBusinessAccess.
 * Returns null if not authenticated or no access.
 */
export async function getBusinessAccess(
  businessId: string
): Promise<BusinessAccess | null> {
  const session = await getCurrentUser()
  if (!session) {
    return null
  }

  return validateBusinessAccess(session.userId, businessId)
}

/**
 * Require business access - throws if not authenticated or no access.
 * Use in API routes that need business context.
 */
export async function requireBusinessAccess(
  businessId: string
): Promise<BusinessAccess> {
  const access = await getBusinessAccess(businessId)
  if (!access) {
    throw new Error('Unauthorized: No access to this business')
  }
  return access
}
