import 'server-only'
import { SignJWT, importPKCS8 } from 'jose'

export interface AppleClientSecretInput {
  teamId: string
  clientId: string
  keyId: string
  privateKey: string
}

export async function mintAppleClientSecret(
  input: AppleClientSecretInput
): Promise<string> {
  const key = await importPKCS8(input.privateKey, 'ES256')
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: input.keyId })
    .setIssuer(input.teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60)
    .setAudience('https://appleid.apple.com')
    .setSubject(input.clientId)
    .sign(key)
}
