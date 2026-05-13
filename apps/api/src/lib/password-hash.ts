/**
 * Password hashing — scrypt only.
 *
 * Legacy bcrypt support was removed in T30 alongside the dropping of the
 * old `users.password` column. Any bcrypt hashes that remain in
 * `account.password` will not verify; affected users must use Forgot
 * Password to set a new scrypt hash.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SCRYPT_KEY_LEN = 64
const SCRYPT_SALT_LEN = 16
const SCRYPT_PREFIX = 'scrypt:'

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_LEN)
  const derived = scryptSync(password, salt, SCRYPT_KEY_LEN)
  return `${SCRYPT_PREFIX}${salt.toString('hex')}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash.startsWith(SCRYPT_PREFIX)) return false
  const parts = hash.split(':')
  if (parts.length !== 3) return false
  const [, saltHex, derivedHex] = parts
  if (!saltHex || !derivedHex) return false
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(derivedHex)) return false
  try {
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(derivedHex, 'hex')
    const actual = scryptSync(password, salt, expected.length)
    if (actual.length !== expected.length) return false
    return timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}
