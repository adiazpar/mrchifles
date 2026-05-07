/**
 * Bounds for invite code expiration (validated server-side on create/regenerate).
 * Kept in one place so the client duration picker and the server validator agree.
 */
const INVITE_EXPIRY_MIN_MS = 60 * 60 * 1000              // 1 hour
const INVITE_EXPIRY_MAX_MS = 30 * 24 * 60 * 60 * 1000    // 30 days

export function isExpiryWithinBounds(expiresAt: Date, now: Date = new Date()): boolean {
  const delta = expiresAt.getTime() - now.getTime()
  return delta >= INVITE_EXPIRY_MIN_MS && delta <= INVITE_EXPIRY_MAX_MS
}
