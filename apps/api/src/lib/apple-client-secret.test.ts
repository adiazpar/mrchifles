// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generateKeyPair, exportPKCS8, jwtVerify } from 'jose'
import { mintAppleClientSecret } from './apple-client-secret'

async function makeKeyPair() {
  const { publicKey, privateKey } = await generateKeyPair('ES256', {
    extractable: true,
  })
  const pkcs8Pem = await exportPKCS8(privateKey)
  return { publicKey, pkcs8Pem }
}

describe('mintAppleClientSecret', () => {
  it('returns a JWT signed by the supplied key with Apple-shaped claims', async () => {
    const { publicKey, pkcs8Pem } = await makeKeyPair()

    const jwt = await mintAppleClientSecret({
      teamId: 'TEAM1234',
      clientId: 'app.kasero.web',
      keyId: 'KEY5678',
      privateKey: pkcs8Pem,
    })

    const { payload, protectedHeader } = await jwtVerify(jwt, publicKey, {
      audience: 'https://appleid.apple.com',
      issuer: 'TEAM1234',
    })

    expect(protectedHeader.alg).toBe('ES256')
    expect(protectedHeader.kid).toBe('KEY5678')
    expect(payload.sub).toBe('app.kasero.web')
    expect(payload.iss).toBe('TEAM1234')
    expect(payload.aud).toBe('https://appleid.apple.com')

    const now = Math.floor(Date.now() / 1000)
    expect(payload.iat).toBeGreaterThanOrEqual(now - 5)
    expect(payload.iat).toBeLessThanOrEqual(now + 5)
    expect(payload.exp).toBeGreaterThan(now + 60 * 59)  // ~1 hour
    expect(payload.exp).toBeLessThanOrEqual(now + 60 * 60 + 5)
  })

  it('throws on a malformed private key', async () => {
    await expect(
      mintAppleClientSecret({
        teamId: 'T',
        clientId: 'C',
        keyId: 'K',
        privateKey: 'not-a-pem',
      })
    ).rejects.toThrow()
  })
})
