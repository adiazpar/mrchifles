import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  hashPin,
  verifyPin,
  isValidPin,
  generateInviteCode,
  isValidInviteCode,
  getInviteCodeExpiration,
  getUserInitials,
  getRoleLabel,
  getInviteRoleLabel,
  isOwner,
  isPartnerOrOwner,
  createSessionState,
  shouldLockSession,
  isLockedOut,
  getLockoutRemainingSeconds,
  recordFailedAttempt,
  resetPinAttempts,
  updateActivity,
  pinSchema,
  emailSchema,
  nameSchema,
  passwordSchema,
  inviteCodeSchema,
} from './auth'
import type { User } from '@/types'

// ============================================
// PIN HASHING TESTS
// ============================================

describe('hashPin', () => {
  it('should return a consistent hash for the same PIN', async () => {
    const hash1 = await hashPin('1234')
    const hash2 = await hashPin('1234')
    expect(hash1).toBe(hash2)
  })

  it('should return different hashes for different PINs', async () => {
    const hash1 = await hashPin('1234')
    const hash2 = await hashPin('5678')
    expect(hash1).not.toBe(hash2)
  })

  it('should return a non-empty string', async () => {
    const hash = await hashPin('0000')
    expect(hash).toBeTruthy()
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
  })
})

describe('verifyPin', () => {
  it('should return true for correct PIN', async () => {
    const hash = await hashPin('1234')
    const result = await verifyPin('1234', hash)
    expect(result).toBe(true)
  })

  it('should return false for incorrect PIN', async () => {
    const hash = await hashPin('1234')
    const result = await verifyPin('5678', hash)
    expect(result).toBe(false)
  })

  it('should return false for empty PIN', async () => {
    const hash = await hashPin('1234')
    const result = await verifyPin('', hash)
    expect(result).toBe(false)
  })
})

describe('isValidPin', () => {
  it('should return true for 4-digit PIN', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('0000')).toBe(true)
    expect(isValidPin('9999')).toBe(true)
  })

  it('should return false for non-4-digit strings', () => {
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('')).toBe(false)
  })

  it('should return false for non-numeric strings', () => {
    expect(isValidPin('abcd')).toBe(false)
    expect(isValidPin('12ab')).toBe(false)
    expect(isValidPin('1 34')).toBe(false)
  })
})

// ============================================
// INVITE CODE TESTS
// ============================================

describe('generateInviteCode', () => {
  it('should generate a 6-character code', () => {
    const code = generateInviteCode()
    expect(code.length).toBe(6)
  })

  it('should only contain uppercase letters and numbers', () => {
    const code = generateInviteCode()
    expect(/^[A-Z0-9]+$/.test(code)).toBe(true)
  })

  it('should not contain confusing characters (0, O, I, 1)', () => {
    // Generate multiple codes to increase chance of catching issues
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode()
      expect(code).not.toContain('0')
      expect(code).not.toContain('O')
      expect(code).not.toContain('I')
      expect(code).not.toContain('1')
    }
  })
})

describe('isValidInviteCode', () => {
  it('should return true for valid 6-character alphanumeric codes', () => {
    expect(isValidInviteCode('ABC123')).toBe(true)
    expect(isValidInviteCode('XXXXXX')).toBe(true)
    expect(isValidInviteCode('123456')).toBe(true)
  })

  it('should return false for invalid codes', () => {
    expect(isValidInviteCode('abc123')).toBe(false) // lowercase
    expect(isValidInviteCode('AB123')).toBe(false) // too short
    expect(isValidInviteCode('ABC1234')).toBe(false) // too long
    expect(isValidInviteCode('')).toBe(false)
    expect(isValidInviteCode('ABC-12')).toBe(false) // special char
  })
})

describe('getInviteCodeExpiration', () => {
  it('should return a date 7 days in the future', () => {
    const now = new Date()
    const expiration = getInviteCodeExpiration()
    const diffMs = expiration.getTime() - now.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThanOrEqual(6.99)
    expect(diffDays).toBeLessThanOrEqual(7.01)
  })
})

// ============================================
// USER UTILITIES TESTS
// ============================================

describe('getUserInitials', () => {
  it('should return first two letters of single word name', () => {
    expect(getUserInitials('Juan')).toBe('JU')
    expect(getUserInitials('Ana')).toBe('AN')
  })

  it('should return first letters of first two words', () => {
    expect(getUserInitials('Juan Perez')).toBe('JP')
    expect(getUserInitials('Maria Garcia Lopez')).toBe('MG')
  })

  it('should handle extra whitespace', () => {
    expect(getUserInitials('  Juan  Perez  ')).toBe('JP')
  })

  it('should return uppercase', () => {
    expect(getUserInitials('juan perez')).toBe('JP')
  })
})

describe('getRoleLabel', () => {
  it('should return correct Spanish labels', () => {
    expect(getRoleLabel('owner')).toBe('Dueno')
    expect(getRoleLabel('partner')).toBe('Socio')
    expect(getRoleLabel('employee')).toBe('Empleado')
  })
})

describe('getInviteRoleLabel', () => {
  it('should return correct Spanish labels', () => {
    expect(getInviteRoleLabel('partner')).toBe('Socio')
    expect(getInviteRoleLabel('employee')).toBe('Empleado')
  })
})

describe('isOwner', () => {
  it('should return true for owner role', () => {
    const user = { role: 'owner' } as User
    expect(isOwner(user)).toBe(true)
  })

  it('should return false for non-owner roles', () => {
    expect(isOwner({ role: 'partner' } as User)).toBe(false)
    expect(isOwner({ role: 'employee' } as User)).toBe(false)
  })

  it('should return false for null', () => {
    expect(isOwner(null)).toBe(false)
  })
})

describe('isPartnerOrOwner', () => {
  it('should return true for owner', () => {
    expect(isPartnerOrOwner({ role: 'owner' } as User)).toBe(true)
  })

  it('should return true for partner', () => {
    expect(isPartnerOrOwner({ role: 'partner' } as User)).toBe(true)
  })

  it('should return false for employee', () => {
    expect(isPartnerOrOwner({ role: 'employee' } as User)).toBe(false)
  })

  it('should return false for null', () => {
    expect(isPartnerOrOwner(null)).toBe(false)
  })
})

// ============================================
// SESSION MANAGEMENT TESTS
// ============================================

describe('createSessionState', () => {
  it('should create initial state with correct defaults', () => {
    const state = createSessionState()
    expect(state.isLocked).toBe(false)
    expect(state.failedAttempts).toBe(0)
    expect(state.lockoutUntil).toBeNull()
    expect(state.lastActivity).toBeCloseTo(Date.now(), -2) // within 100ms
  })
})

describe('shouldLockSession', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return false when activity is recent', () => {
    const state = createSessionState()
    expect(shouldLockSession(state)).toBe(false)
  })

  it('should return true after 5 minutes of inactivity', () => {
    const state = createSessionState()
    vi.advanceTimersByTime(5 * 60 * 1000 + 1) // 5 minutes + 1ms
    expect(shouldLockSession(state)).toBe(true)
  })

  it('should return false just before 5 minutes', () => {
    const state = createSessionState()
    vi.advanceTimersByTime(5 * 60 * 1000 - 1000) // 5 minutes - 1 second
    expect(shouldLockSession(state)).toBe(false)
  })
})

describe('isLockedOut', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return false when lockoutUntil is null', () => {
    const state = createSessionState()
    expect(isLockedOut(state)).toBe(false)
  })

  it('should return true when lockout is active', () => {
    const state = {
      ...createSessionState(),
      lockoutUntil: Date.now() + 10000, // 10 seconds in future
    }
    expect(isLockedOut(state)).toBe(true)
  })

  it('should return false when lockout has expired', () => {
    const state = {
      ...createSessionState(),
      lockoutUntil: Date.now() - 1000, // 1 second in past
    }
    expect(isLockedOut(state)).toBe(false)
  })
})

describe('getLockoutRemainingSeconds', () => {
  it('should return 0 when no lockout', () => {
    const state = createSessionState()
    expect(getLockoutRemainingSeconds(state)).toBe(0)
  })

  it('should return remaining seconds', () => {
    const state = {
      ...createSessionState(),
      lockoutUntil: Date.now() + 15000, // 15 seconds
    }
    const remaining = getLockoutRemainingSeconds(state)
    expect(remaining).toBeGreaterThanOrEqual(14)
    expect(remaining).toBeLessThanOrEqual(15)
  })

  it('should return 0 for expired lockout', () => {
    const state = {
      ...createSessionState(),
      lockoutUntil: Date.now() - 1000,
    }
    expect(getLockoutRemainingSeconds(state)).toBe(0)
  })
})

describe('recordFailedAttempt', () => {
  it('should increment failed attempts', () => {
    let state = createSessionState()
    state = recordFailedAttempt(state)
    expect(state.failedAttempts).toBe(1)
    state = recordFailedAttempt(state)
    expect(state.failedAttempts).toBe(2)
  })

  it('should set lockout after 3 failed attempts', () => {
    let state = createSessionState()
    state = recordFailedAttempt(state) // 1
    expect(state.lockoutUntil).toBeNull()
    state = recordFailedAttempt(state) // 2
    expect(state.lockoutUntil).toBeNull()
    state = recordFailedAttempt(state) // 3
    expect(state.lockoutUntil).not.toBeNull()
    expect(state.lockoutUntil).toBeGreaterThan(Date.now())
  })

  it('should set 30 second lockout', () => {
    let state = createSessionState()
    state = recordFailedAttempt(state)
    state = recordFailedAttempt(state)
    state = recordFailedAttempt(state)
    const lockoutDuration = state.lockoutUntil! - Date.now()
    expect(lockoutDuration).toBeGreaterThanOrEqual(29000)
    expect(lockoutDuration).toBeLessThanOrEqual(30000)
  })
})

describe('resetPinAttempts', () => {
  it('should reset failed attempts to 0', () => {
    let state = createSessionState()
    state = recordFailedAttempt(state)
    state = recordFailedAttempt(state)
    state = resetPinAttempts(state)
    expect(state.failedAttempts).toBe(0)
  })

  it('should clear lockout', () => {
    let state = createSessionState()
    state = recordFailedAttempt(state)
    state = recordFailedAttempt(state)
    state = recordFailedAttempt(state)
    expect(state.lockoutUntil).not.toBeNull()
    state = resetPinAttempts(state)
    expect(state.lockoutUntil).toBeNull()
  })

  it('should update lastActivity', () => {
    const oldTime = Date.now() - 10000
    const state = {
      ...createSessionState(),
      lastActivity: oldTime,
    }
    const newState = resetPinAttempts(state)
    expect(newState.lastActivity).toBeGreaterThan(oldTime)
  })
})

describe('updateActivity', () => {
  it('should update lastActivity timestamp', () => {
    const oldTime = Date.now() - 10000
    const state = {
      ...createSessionState(),
      lastActivity: oldTime,
    }
    const newState = updateActivity(state)
    expect(newState.lastActivity).toBeGreaterThan(oldTime)
    expect(newState.lastActivity).toBeCloseTo(Date.now(), -2)
  })

  it('should preserve other state', () => {
    const state = {
      ...createSessionState(),
      failedAttempts: 2,
      isLocked: true,
    }
    const newState = updateActivity(state)
    expect(newState.failedAttempts).toBe(2)
    expect(newState.isLocked).toBe(true)
  })
})

// ============================================
// ZOD SCHEMA TESTS
// ============================================

describe('pinSchema', () => {
  it('should accept valid 4-digit PIN', () => {
    expect(pinSchema.safeParse('1234').success).toBe(true)
    expect(pinSchema.safeParse('0000').success).toBe(true)
  })

  it('should reject invalid PINs', () => {
    expect(pinSchema.safeParse('123').success).toBe(false)
    expect(pinSchema.safeParse('12345').success).toBe(false)
    expect(pinSchema.safeParse('abcd').success).toBe(false)
  })
})

describe('emailSchema', () => {
  it('should accept valid emails', () => {
    expect(emailSchema.safeParse('test@example.com').success).toBe(true)
    expect(emailSchema.safeParse('user.name@domain.co.pe').success).toBe(true)
  })

  it('should reject invalid emails', () => {
    expect(emailSchema.safeParse('notanemail').success).toBe(false)
    expect(emailSchema.safeParse('@domain.com').success).toBe(false)
    expect(emailSchema.safeParse('').success).toBe(false)
  })
})

describe('nameSchema', () => {
  it('should accept valid names', () => {
    expect(nameSchema.safeParse('Juan').success).toBe(true)
    expect(nameSchema.safeParse('Maria Garcia').success).toBe(true)
  })

  it('should reject too short names', () => {
    expect(nameSchema.safeParse('J').success).toBe(false)
    expect(nameSchema.safeParse('').success).toBe(false)
  })

  it('should reject too long names', () => {
    const longName = 'a'.repeat(101)
    expect(nameSchema.safeParse(longName).success).toBe(false)
  })
})

describe('passwordSchema', () => {
  it('should accept passwords with 8+ characters', () => {
    expect(passwordSchema.safeParse('password1').success).toBe(true)
    expect(passwordSchema.safeParse('12345678').success).toBe(true)
  })

  it('should reject passwords shorter than 8 characters', () => {
    expect(passwordSchema.safeParse('pass').success).toBe(false)
    expect(passwordSchema.safeParse('1234567').success).toBe(false)
    expect(passwordSchema.safeParse('').success).toBe(false)
  })
})

describe('inviteCodeSchema', () => {
  it('should accept valid 6-character uppercase alphanumeric codes', () => {
    expect(inviteCodeSchema.safeParse('ABC123').success).toBe(true)
    expect(inviteCodeSchema.safeParse('XXXXXX').success).toBe(true)
  })

  it('should reject invalid codes', () => {
    expect(inviteCodeSchema.safeParse('abc123').success).toBe(false)
    expect(inviteCodeSchema.safeParse('AB123').success).toBe(false)
    expect(inviteCodeSchema.safeParse('ABC1234').success).toBe(false)
  })
})
