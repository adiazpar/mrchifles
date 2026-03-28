/**
 * Client-safe role utilities.
 * These can be used in both client and server components.
 */

export type BusinessRole = 'owner' | 'partner' | 'employee'

/**
 * Check if user has owner or partner role (can manage team, settings, etc.)
 */
export function canManageBusiness(role: BusinessRole | null | undefined): boolean {
  return role === 'owner' || role === 'partner'
}

/**
 * Check if user is the owner
 */
export function isOwner(role: BusinessRole | null | undefined): boolean {
  return role === 'owner'
}
