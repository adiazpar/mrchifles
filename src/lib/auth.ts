import type { User, UserRole, InviteRole } from '@/types'

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

/**
 * Validate invite code format (6 uppercase alphanumeric)
 */
export function isValidInviteCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code)
}

/**
 * Validate transfer code format (8 uppercase alphanumeric)
 */
export function isValidTransferCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code)
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
    owner: 'Owner',
    partner: 'Partner',
    employee: 'Employee',
  }
  return labels[role]
}

/**
 * Get display label for invite role
 */
export function getInviteRoleLabel(role: InviteRole): string {
  const labels: Record<InviteRole, string> = {
    partner: 'Partner',
    employee: 'Employee',
  }
  return labels[role]
}

// NOTE: Role-based permission checks (isOwner, isPartnerOrOwner) have been moved
// to src/lib/business-auth.ts since role is now per-business in business_users table.
// Use isOwner(role: BusinessRole) and canManageBusiness(role: BusinessRole) instead.

// ============================================
// VALIDATION SCHEMAS (using Zod)
// ============================================

import { z } from 'zod'

export const emailSchema = z.string()
  .email('Invalid email')

export const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name is too long')

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')

export const inviteCodeSchema = z.string()
  .regex(/^[A-Z0-9]{6}$/, 'Invalid code')

export const ownerRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
})

export const employeeRegistrationSchema = z.object({
  inviteCode: inviteCodeSchema,
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export type OwnerRegistrationData = z.infer<typeof ownerRegistrationSchema>
export type EmployeeRegistrationData = z.infer<typeof employeeRegistrationSchema>
export type LoginData = z.infer<typeof loginSchema>
