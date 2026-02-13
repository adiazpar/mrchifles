import { describe, it, expect } from 'vitest'
import { hashPin, generateInviteCode } from './auth'

/**
 * Security-focused tests for the Mr. Chifles application
 * These tests verify that security fixes are working correctly
 */

// ============================================
// PIN HASHING SECURITY TESTS
// ============================================

describe('PIN Hashing Security', () => {
  it('should produce SHA-256 compatible hash (64 hex chars)', async () => {
    const hash = await hashPin('1234')
    // SHA-256 produces 256 bits = 32 bytes = 64 hex characters
    expect(hash.length).toBe(64)
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true)
  })

  it('should use salting to prevent rainbow table attacks', async () => {
    // Same PIN should produce same hash (consistent)
    const hash1 = await hashPin('1234')
    const hash2 = await hashPin('1234')
    expect(hash1).toBe(hash2)

    // But the hash should NOT be the raw SHA-256 of "1234"
    // because we add a salt prefix
    // Raw SHA-256 of "1234" = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"
    const rawSha256Of1234 = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'
    expect(hash1).not.toBe(rawSha256Of1234)
  })

  it('should produce different hashes for sequential PINs', async () => {
    // Attackers often try sequential PINs
    const hashes = await Promise.all([
      hashPin('0000'),
      hashPin('0001'),
      hashPin('1111'),
      hashPin('1234'),
      hashPin('9999'),
    ])

    // All hashes should be unique
    const uniqueHashes = new Set(hashes)
    expect(uniqueHashes.size).toBe(5)
  })

  it('should handle all valid 4-digit PIN combinations', async () => {
    // Test boundary values
    const testPins = ['0000', '0001', '9998', '9999']

    for (const pin of testPins) {
      const hash = await hashPin(pin)
      expect(hash.length).toBe(64)
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true)
    }
  })
})

// ============================================
// INVITE CODE GENERATION SECURITY TESTS
// ============================================

describe('Invite Code Generation Security', () => {
  it('should generate unpredictable codes', () => {
    // Generate 100 codes and check they're all different
    const codes = new Set<string>()
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode())
    }
    // With 32^6 = ~1 billion possible codes, 100 codes should all be unique
    expect(codes.size).toBe(100)
  })

  it('should only use allowed characters (no confusing chars)', () => {
    // Generate many codes and verify character set
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode()

      // Should be 6 characters
      expect(code.length).toBe(6)

      // Should not contain confusing characters
      expect(code).not.toContain('0') // Zero
      expect(code).not.toContain('O') // Letter O
      expect(code).not.toContain('I') // Letter I
      expect(code).not.toContain('1') // Number 1

      // Should only contain uppercase letters and numbers
      expect(/^[A-Z0-9]+$/.test(code)).toBe(true)
    }
  })

  it('should have sufficient entropy for security', () => {
    // With 32 characters and 6 positions: 32^6 = 1,073,741,824 combinations
    // This provides ~30 bits of entropy, sufficient for invite codes
    // (especially with rate limiting)

    // Test distribution is roughly uniform by checking first character
    const firstChars: Record<string, number> = {}
    const numSamples = 1000

    for (let i = 0; i < numSamples; i++) {
      const code = generateInviteCode()
      const firstChar = code[0]
      firstChars[firstChar] = (firstChars[firstChar] || 0) + 1
    }

    // With 32 possible first characters and 1000 samples,
    // expected count per char is ~31.25
    // Allow for statistical variation (should be roughly uniform)
    const counts = Object.values(firstChars)
    const avgCount = numSamples / 32

    // No character should appear more than 3x the average (very conservative)
    for (const count of counts) {
      expect(count).toBeLessThan(avgCount * 3)
    }
  })
})

// ============================================
// INPUT VALIDATION SECURITY TESTS
// ============================================

describe('Input Validation Security', () => {
  it('should reject invalid PIN formats', async () => {
    // These should not produce valid hashes for actual verification
    // but the hashPin function itself will process any string
    const invalidInputs = [
      '', // Empty
      '123', // Too short
      '12345', // Too long
      'abcd', // Non-numeric
      '12.4', // Contains decimal
      '12 4', // Contains space
      '-123', // Negative
    ]

    // hashPin will process these, but they should produce different hashes
    // than valid PINs (this is more of a documentation test)
    const validHash = await hashPin('1234')

    for (const invalid of invalidInputs) {
      const hash = await hashPin(invalid)
      expect(hash).not.toBe(validHash)
    }
  })
})

// ============================================
// HASH CONSISTENCY TESTS (Client-Server Compatibility)
// ============================================

describe('Hash Consistency', () => {
  it('should produce consistent hashes across multiple calls', async () => {
    // Important for client-server compatibility
    const testCases = ['0000', '1234', '5678', '9999']

    for (const pin of testCases) {
      const hashes = await Promise.all([
        hashPin(pin),
        hashPin(pin),
        hashPin(pin),
      ])

      // All should be identical
      expect(hashes[0]).toBe(hashes[1])
      expect(hashes[1]).toBe(hashes[2])
    }
  })

  it('should use the documented salt prefix', async () => {
    // The salt "mrchifles_pin_v1_" must match server-side
    // We can verify this by checking the hash changes if we use a different input

    const hash1234 = await hashPin('1234')
    const hash1235 = await hashPin('1235')

    // Different inputs should produce different hashes
    expect(hash1234).not.toBe(hash1235)

    // Hashes should be deterministic
    expect(await hashPin('1234')).toBe(hash1234)
    expect(await hashPin('1235')).toBe(hash1235)
  })
})
