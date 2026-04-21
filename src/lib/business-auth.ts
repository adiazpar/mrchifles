import { db, businessUsers, businesses } from '@/db'
import { eq, and } from 'drizzle-orm'
import { getCurrentUser } from './simple-auth'

// Re-export client-safe utilities
export { isOwner, canManageBusiness } from './business-role'
import type { BusinessRole } from './business-role'
export type { BusinessRole }

export interface BusinessAccess {
  userId: string
  businessId: string
  businessName: string
  businessType: 'food' | 'retail' | 'services' | 'wholesale' | 'manufacturing' | 'other' | null
  businessIcon: string | null
  businessLocale: string
  businessCurrency: string
  role: BusinessRole
}

// ============================================
// ACCESS CACHE (in-memory, per function instance)
// ============================================

const CACHE_TTL_MS = 60_000 // 60 seconds

interface CachedAccess {
  access: BusinessAccess
  expiresAt: number
}

// Key format: "userId:businessId"
const accessCache = new Map<string, CachedAccess>()

function getCacheKey(userId: string, businessId: string): string {
  return `${userId}:${businessId}`
}

/**
 * Invalidate cached access for a user in a specific business.
 * Call after role changes, membership removal, etc.
 */
export function invalidateAccessCache(userId: string, businessId: string): void {
  accessCache.delete(getCacheKey(userId, businessId))
}

/**
 * Require business access - throws if not authenticated or no access.
 * Uses a short-lived in-memory cache to avoid repeated DB queries.
 */
export async function requireBusinessAccess(
  businessId: string
): Promise<BusinessAccess> {
  const session = await getCurrentUser()
  if (!session) {
    throw new Error('Unauthorized: Not authenticated')
  }

  // Check cache
  const cacheKey = getCacheKey(session.userId, businessId)
  const cached = accessCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.access
  }

  // Cache miss or expired — query DB
  const membership = await db
    .select({
      businessId: businessUsers.businessId,
      role: businessUsers.role,
      status: businessUsers.status,
      businessName: businesses.name,
      businessType: businesses.type,
      businessIcon: businesses.icon,
      businessLocale: businesses.locale,
      businessCurrency: businesses.currency,
    })
    .from(businessUsers)
    .innerJoin(businesses, eq(businessUsers.businessId, businesses.id))
    .where(
      and(
        eq(businessUsers.userId, session.userId),
        eq(businessUsers.businessId, businessId),
        eq(businessUsers.status, 'active')
      )
    )
    .get()

  if (!membership) {
    // Clear any stale cache entry
    accessCache.delete(cacheKey)
    throw new Error('Unauthorized: No access to this business')
  }

  const access: BusinessAccess = {
    userId: session.userId,
    businessId: membership.businessId,
    businessName: membership.businessName,
    businessType: membership.businessType,
    businessIcon: membership.businessIcon,
    businessLocale: membership.businessLocale ?? 'en-US',
    businessCurrency: membership.businessCurrency ?? 'USD',
    role: membership.role as BusinessRole,
  }

  // Cache the result
  accessCache.set(cacheKey, {
    access,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })

  return access
}
