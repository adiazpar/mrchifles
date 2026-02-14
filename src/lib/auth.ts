import type { User, UserRole, InviteRole } from '@/types'

// ============================================
// PIN HASHING (SHA-256 implementation)
// ============================================

const SALT_PREFIX = 'mrchifles_pin_v1_'

/**
 * Hash a PIN using SHA-256
 * Uses Web Crypto API when available, falls back to pure-JS implementation
 * The same algorithm is used server-side in pb_hooks for verification
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

  // Pure JS SHA-256 fallback for non-secure contexts (HTTP)
  return sha256(input)
}

/**
 * Pure JavaScript SHA-256 implementation
 * Based on the FIPS 180-4 specification
 * Used as fallback when Web Crypto API is not available
 */
function sha256(message: string): string {
  // Convert string to UTF-8 byte array
  const encoder = new TextEncoder()
  const msgBuffer = encoder.encode(message)

  // SHA-256 constants
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]

  // Initial hash values
  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]

  // Pre-processing: adding padding bits
  const msgLen = msgBuffer.length
  const bitLen = msgLen * 8

  // Message needs to be padded to 512-bit (64-byte) blocks
  // Padding: 1 bit (0x80 byte), then zeros, then 64-bit length (8 bytes)
  // Total must be multiple of 64: msgLen + 1 + zeros + 8 ≡ 0 (mod 64)
  const padLen = (64 - ((msgLen + 9) % 64)) % 64
  const paddedLen = msgLen + 1 + padLen + 8

  const padded = new Uint8Array(paddedLen)
  padded.set(msgBuffer)
  padded[msgLen] = 0x80  // Append bit '1'

  // Append length in bits as 64-bit big-endian
  const view = new DataView(padded.buffer)
  view.setUint32(paddedLen - 4, bitLen, false)

  // Process each 512-bit (64-byte) block
  for (let i = 0; i < paddedLen; i += 64) {
    const W = new Uint32Array(64)

    // Copy block into first 16 words
    for (let j = 0; j < 16; j++) {
      W[j] = view.getUint32(i + j * 4, false)
    }

    // Extend to 64 words
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(W[j - 15], 7) ^ rotr(W[j - 15], 18) ^ (W[j - 15] >>> 3)
      const s1 = rotr(W[j - 2], 17) ^ rotr(W[j - 2], 19) ^ (W[j - 2] >>> 10)
      W[j] = (W[j - 16] + s0 + W[j - 7] + s1) >>> 0
    }

    // Initialize working variables
    let [a, b, c, d, e, f, g, h] = H

    // Main loop
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + K[j] + W[j]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0

      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    // Add to hash
    H = [
      (H[0] + a) >>> 0, (H[1] + b) >>> 0, (H[2] + c) >>> 0, (H[3] + d) >>> 0,
      (H[4] + e) >>> 0, (H[5] + f) >>> 0, (H[6] + g) >>> 0, (H[7] + h) >>> 0
    ]
  }

  // Convert to hex string
  return H.map(h => h.toString(16).padStart(8, '0')).join('')
}

/**
 * Right rotate (circular right shift)
 */
function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0
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
 * Generate a random 6-character invite code using cryptographically secure random numbers
 * Uses crypto.getRandomValues() instead of Math.random() to prevent prediction attacks
 */
export function generateInviteCode(): string {
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map(byte => INVITE_CODE_CHARS[byte % INVITE_CODE_CHARS.length])
    .join('')
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
 * Format PIN error message based on failed attempts
 */
export function formatPinErrorMessage(failedAttempts: number): string {
  const attemptsLeft = MAX_PIN_ATTEMPTS - failedAttempts - 1
  if (attemptsLeft > 0) {
    return `PIN incorrecto. ${attemptsLeft} intento${attemptsLeft === 1 ? '' : 's'} restante${attemptsLeft === 1 ? '' : 's'}`
  }
  return 'Demasiados intentos fallidos'
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
