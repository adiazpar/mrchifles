import { describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { isBcryptHash, verifyPassword, hashPassword } from './password-hash'

describe('password-hash', () => {
  it('identifies bcrypt hashes', async () => {
    const hash = await bcrypt.hash('test', 4)
    expect(isBcryptHash(hash)).toBe(true)
  })

  it('does not identify scrypt hashes as bcrypt', () => {
    const fakeScrypt = 'scrypt:a1b2:c3d4'
    expect(isBcryptHash(fakeScrypt)).toBe(false)
  })

  it('does not identify garbage as bcrypt', () => {
    expect(isBcryptHash('')).toBe(false)
    expect(isBcryptHash('garbage')).toBe(false)
    expect(isBcryptHash('$3$invalid')).toBe(false)
  })

  it('verifies a bcrypt-hashed password', async () => {
    const hash = await bcrypt.hash('correct', 4)
    expect(await verifyPassword('correct', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('hashPassword produces a scrypt hash by default', async () => {
    const hash = await hashPassword('test')
    expect(isBcryptHash(hash)).toBe(false)
    expect(hash.startsWith('scrypt:')).toBe(true)
    // Format: scrypt:<saltHex>:<derivedHex>
    const parts = hash.split(':')
    expect(parts).toHaveLength(3)
    expect(parts[1]).toMatch(/^[0-9a-f]+$/)
    expect(parts[2]).toMatch(/^[0-9a-f]+$/)
  })

  it('hashPassword + verifyPassword round-trip', async () => {
    const hash = await hashPassword('round-trip')
    expect(await verifyPassword('round-trip', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('verifyPassword returns false (does not throw) on malformed hash', async () => {
    expect(await verifyPassword('anything', 'not-a-real-hash')).toBe(false)
    expect(await verifyPassword('anything', 'scrypt:')).toBe(false)
    expect(await verifyPassword('anything', 'scrypt:onlyone')).toBe(false)
  })

  it('produces different scrypt hashes for the same password (random salt)', async () => {
    const a = await hashPassword('same-password')
    const b = await hashPassword('same-password')
    expect(a).not.toBe(b)
    // But both verify
    expect(await verifyPassword('same-password', a)).toBe(true)
    expect(await verifyPassword('same-password', b)).toBe(true)
  })
})
