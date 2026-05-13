/**
 * AES-256-GCM at-rest encryption for TOTP shared secrets.
 *
 * Storage format: base64(iv || tag || ciphertext)
 *   - iv:        12 bytes (GCM standard)
 *   - tag:       16 bytes (GCM auth tag)
 *   - ciphertext: variable
 *
 * The key is read from TWO_FACTOR_ENCRYPTION_KEY (base64). Key rotation
 * invalidates all existing TOTP secrets — users must re-enroll. The key
 * is read lazily at call time so tests and processes that never touch
 * 2FA don't require the env var at boot.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16
const KEY_LEN = 32

function getKey(): Buffer {
  const raw = process.env.TWO_FACTOR_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY is not set')
  }
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== KEY_LEN) {
    throw new Error(`TWO_FACTOR_ENCRYPTION_KEY must decode to exactly 32 bytes (got ${buf.length})`)
  }
  return buf
}

export function encryptSecret(plain: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

export function decryptSecret(encoded: string): string {
  const key = getKey()
  const buf = Buffer.from(encoded, 'base64')
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Invalid ciphertext: too short')
  }
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return pt.toString('utf8')
}
