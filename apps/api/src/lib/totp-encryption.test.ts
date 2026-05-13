import { describe, expect, it, beforeEach, vi } from 'vitest'

// Tests reset modules and the env var so each test starts from a clean
// import. The implementation is allowed to read the env var once at module
// load OR lazily at call time — both are tested by resetting modules.
beforeEach(() => {
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'aGVsbG93b3JsZGhlbGxvd29ybGRoZWxsb3dvcmxkaGU='
  vi.resetModules()
})

describe('totp-encryption', () => {
  it('round-trips a secret', async () => {
    const { encryptSecret, decryptSecret } = await import('./totp-encryption')
    const plain = 'JBSWY3DPEHPK3PXP'
    const enc = encryptSecret(plain)
    expect(enc).not.toContain(plain)
    expect(decryptSecret(enc)).toBe(plain)
  })

  it('produces different ciphertexts for the same input (fresh IV)', async () => {
    const { encryptSecret } = await import('./totp-encryption')
    const a = encryptSecret('same-secret')
    const b = encryptSecret('same-secret')
    expect(a).not.toBe(b)
  })

  it('throws on tampered ciphertext', async () => {
    const { encryptSecret, decryptSecret } = await import('./totp-encryption')
    const enc = encryptSecret('JBSWY3DPEHPK3PXP')
    // Flip the last data byte of the base64 to invalidate the auth tag.
    const buf = Buffer.from(enc, 'base64')
    buf[buf.length - 1] ^= 0xff
    const tampered = buf.toString('base64')
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it('throws on truncated ciphertext', async () => {
    const { decryptSecret } = await import('./totp-encryption')
    expect(() => decryptSecret('aGVsbG8=')).toThrow()
  })

  it('throws if key env var is missing', async () => {
    delete process.env.TWO_FACTOR_ENCRYPTION_KEY
    vi.resetModules()
    const { encryptSecret } = await import('./totp-encryption')
    expect(() => encryptSecret('x')).toThrow(/TWO_FACTOR_ENCRYPTION_KEY/)
  })

  it('throws if key decodes to wrong length', async () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = Buffer.from('short').toString('base64')
    vi.resetModules()
    const { encryptSecret } = await import('./totp-encryption')
    expect(() => encryptSecret('x')).toThrow(/32 bytes/)
  })

  it('returns base64-encoded ciphertext', async () => {
    const { encryptSecret } = await import('./totp-encryption')
    const enc = encryptSecret('JBSWY3DPEHPK3PXP')
    // Strict base64: no whitespace, length divisible by 4 with padding.
    expect(enc).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    expect(enc.length % 4).toBe(0)
  })
})
