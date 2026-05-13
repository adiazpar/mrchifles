import { describe, expect, it } from 'vitest'
import { verifyPassword, hashPassword } from './password-hash'

describe('password-hash (scrypt-only)', () => {
  it('hashPassword produces a scrypt hash', async () => {
    const hash = await hashPassword('test')
    expect(hash.startsWith('scrypt:')).toBe(true)
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

  it('verifyPassword returns false for legacy bcrypt hashes', async () => {
    // After T30 bcrypt is unsupported. A historical $2-prefixed hash
    // must fail to verify rather than throw.
    const legacy = '$2b$10$abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmn'
    expect(await verifyPassword('anything', legacy)).toBe(false)
  })

  it('produces different scrypt hashes for the same password (random salt)', async () => {
    const a = await hashPassword('same')
    const b = await hashPassword('same')
    expect(a).not.toBe(b)
    expect(await verifyPassword('same', a)).toBe(true)
    expect(await verifyPassword('same', b)).toBe(true)
  })
})
