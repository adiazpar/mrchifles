/**
 * Password hash dispatcher for the better-auth migration window.
 *
 * - `verifyPassword` accepts BOTH bcrypt (legacy, $2a/$2b/$2y prefix) and
 *   scrypt (new, `scrypt:<saltHex>:<derivedHex>` format) hashes. better-auth
 *   wires this in as the `emailAndPassword.password.verify` callback so a
 *   legacy user's first post-migration sign-in still works.
 * - `hashPassword` produces scrypt. Re-hashing of legacy users happens at
 *   sign-in time inside better-auth (it stores whatever `hash()` returns
 *   alongside the verified password) — no explicit migration step needed.
 *
 * After T30 (drops bcrypt), the bcrypt branch and the bcryptjs dep are
 * removed; `verifyPassword` becomes scrypt-only.
 */
import bcrypt from 'bcryptjs'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SCRYPT_KEY_LEN = 64
const SCRYPT_SALT_LEN = 16

const BCRYPT_PREFIX_RE = /^\$2[aby]\$/
const SCRYPT_PREFIX = 'scrypt:'

export function isBcryptHash(hash: string): boolean {
  return BCRYPT_PREFIX_RE.test(hash)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_LEN)
  const derived = scryptSync(password, salt, SCRYPT_KEY_LEN)
  return `${SCRYPT_PREFIX}${salt.toString('hex')}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (isBcryptHash(hash)) {
    try {
      return await bcrypt.compare(password, hash)
    } catch {
      return false
    }
  }
  if (hash.startsWith(SCRYPT_PREFIX)) {
    const parts = hash.split(':')
    if (parts.length !== 3) return false
    const [, saltHex, derivedHex] = parts
    if (!saltHex || !derivedHex) return false
    if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(derivedHex)) return false
    try {
      const salt = Buffer.from(saltHex, 'hex')
      const expected = Buffer.from(derivedHex, 'hex')
      const actual = scryptSync(password, salt, expected.length)
      // Length-mismatch protection — timingSafeEqual throws on differing lengths.
      if (actual.length !== expected.length) return false
      return timingSafeEqual(expected, actual)
    } catch {
      return false
    }
  }
  return false
}
