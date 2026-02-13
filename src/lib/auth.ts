import type { User, UserRole, InviteRole } from '@/types'

// ============================================
// PIN HASHING (pure JS implementation for HTTP compatibility)
// ============================================

const SALT_PREFIX = 'mrchifles_pin_v1_'

/**
 * Simple hash function that works in non-secure contexts (HTTP)
 * This is suitable for PINs because security comes from rate limiting,
 * not from the hash strength (4 digits = only 10,000 combinations)
 */
export async function hashPin(pin: string): Promise<string> {
  const input = SALT_PREFIX + pin

  // Try Web Crypto API first (works in HTTPS/localhost)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(input)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch {
      // Fall through to pure JS implementation
    }
  }

  // Pure JS hash fallback (works over HTTP)
  // Using a simple but effective hash for PIN purposes
  return simpleHash(input)
}

/**
 * Simple string hash function (djb2 variant + additional mixing)
 * Not cryptographically secure, but sufficient for PIN hashing
 * where rate limiting provides the actual security
 */
function simpleHash(str: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  // Return 64-bit hash as hex string
  const hash = (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
  // Extend to look more like SHA-256 length (repeat pattern)
  return hash + hash + hash + hash
}

/**
 * Verify a PIN against its hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const pinHash = await hashPin(pin)
  return pinHash === hash
}

/**
 * Validate PIN format (4 digits)
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

// ============================================
// INVITE CODE GENERATION
// ============================================

const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excludes confusing chars: 0, O, I, 1

/**
 * Generate a random 6-character invite code
 */
export function generateInviteCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * INVITE_CODE_CHARS.length)
    code += INVITE_CODE_CHARS[randomIndex]
  }
  return code
}

/**
 * Validate invite code format (6 uppercase alphanumeric)
 */
export function isValidInviteCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code)
}

/**
 * Calculate invite code expiration (7 days from now)
 */
export function getInviteCodeExpiration(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 7)
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

/**
 * Get display label for user role
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    owner: 'Dueno',
    partner: 'Socio',
    employee: 'Empleado',
  }
  return labels[role]
}

/**
 * Get display label for invite role
 */
export function getInviteRoleLabel(role: InviteRole): string {
  const labels: Record<InviteRole, string> = {
    partner: 'Socio',
    employee: 'Empleado',
  }
  return labels[role]
}

/**
 * Check if user has owner privileges
 */
export function isOwner(user: User | null): boolean {
  return user?.role === 'owner'
}

/**
 * Check if user has partner or owner privileges
 */
export function isPartnerOrOwner(user: User | null): boolean {
  return user?.role === 'owner' || user?.role === 'partner'
}

// ============================================
// SESSION MANAGEMENT
// ============================================

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const LOCKOUT_DURATION_MS = 30 * 1000 // 30 seconds
const MAX_PIN_ATTEMPTS = 3

export interface SessionState {
  isLocked: boolean
  lastActivity: number
  failedAttempts: number
  lockoutUntil: number | null
}

/**
 * Create initial session state
 */
export function createSessionState(): SessionState {
  return {
    isLocked: false,
    lastActivity: Date.now(),
    failedAttempts: 0,
    lockoutUntil: null,
  }
}

/**
 * Check if session should be locked due to inactivity
 */
export function shouldLockSession(state: SessionState): boolean {
  return Date.now() - state.lastActivity > INACTIVITY_TIMEOUT_MS
}

/**
 * Check if user is currently locked out due to failed attempts
 */
export function isLockedOut(state: SessionState): boolean {
  if (!state.lockoutUntil) return false
  return Date.now() < state.lockoutUntil
}

/**
 * Get remaining lockout time in seconds
 */
export function getLockoutRemainingSeconds(state: SessionState): number {
  if (!state.lockoutUntil) return 0
  const remaining = Math.max(0, state.lockoutUntil - Date.now())
  return Math.ceil(remaining / 1000)
}

/**
 * Record a failed PIN attempt
 */
export function recordFailedAttempt(state: SessionState): SessionState {
  const newAttempts = state.failedAttempts + 1
  return {
    ...state,
    failedAttempts: newAttempts,
    lockoutUntil: newAttempts >= MAX_PIN_ATTEMPTS
      ? Date.now() + LOCKOUT_DURATION_MS
      : null,
  }
}

/**
 * Reset PIN attempts after successful login
 */
export function resetPinAttempts(state: SessionState): SessionState {
  return {
    ...state,
    failedAttempts: 0,
    lockoutUntil: null,
    lastActivity: Date.now(),
  }
}

/**
 * Update last activity timestamp
 */
export function updateActivity(state: SessionState): SessionState {
  return {
    ...state,
    lastActivity: Date.now(),
  }
}

// ============================================
// VALIDATION SCHEMAS (using Zod)
// ============================================

import { z } from 'zod'

export const pinSchema = z.string().regex(/^\d{4}$/, 'El PIN debe ser de 4 digitos')

export const emailSchema = z.string().email('Email invalido')

export const nameSchema = z.string()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(100, 'El nombre es demasiado largo')

export const passwordSchema = z.string()
  .min(8, 'La contrasena debe tener al menos 8 caracteres')

export const inviteCodeSchema = z.string()
  .regex(/^[A-Z0-9]{6}$/, 'Codigo invalido')

export const ownerRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  pin: pinSchema,
})

export const employeeRegistrationSchema = z.object({
  inviteCode: inviteCodeSchema,
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  pin: pinSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
})

export type OwnerRegistrationData = z.infer<typeof ownerRegistrationSchema>
export type EmployeeRegistrationData = z.infer<typeof employeeRegistrationSchema>
export type LoginData = z.infer<typeof loginSchema>
