// ============================================
// SECURE CODE GENERATION
// ============================================

// Excludes confusing chars: 0, O, I, 1
const SECURE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Generate a cryptographically secure random code of specified length
 */
function generateSecureCode(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map(byte => SECURE_CODE_CHARS[byte % SECURE_CODE_CHARS.length])
    .join('')
}

/**
 * Generate a random 6-character invite code
 */
export function generateInviteCode(): string {
  return generateSecureCode(6)
}

/**
 * Generate a random 8-character transfer code
 */
export function generateTransferCode(): string {
  return generateSecureCode(8)
}

export type InviteDuration = '24h' | '7d' | '30d'

const DURATION_MS: Record<InviteDuration, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

/**
 * Calculate invite code expiration based on the chosen duration.
 * Must stay aligned with the server's INVITE_EXPIRY_MIN_MS/MAX_MS bounds.
 */
export function getInviteCodeExpiration(duration: InviteDuration = '7d'): Date {
  const date = new Date()
  date.setTime(date.getTime() + DURATION_MS[duration])
  return date
}

// ============================================
// USER UTILITIES
// ============================================

/**
 * Get user initials for avatar display
 */
export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

