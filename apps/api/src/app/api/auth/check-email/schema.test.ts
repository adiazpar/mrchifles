import { describe, it, expect } from 'vitest'
import { checkEmailSchema } from './schema'

describe('POST /api/auth/check-email schema', () => {
  it('accepts a valid email and normalizes to lowercase', () => {
    const r = checkEmailSchema.safeParse({ email: 'Foo@Example.COM' })
    expect(r.success).toBe(true)
    expect(r.success && r.data.email).toBe('foo@example.com')
  })

  it('rejects missing email', () => {
    const r = checkEmailSchema.safeParse({})
    expect(r.success).toBe(false)
    expect(r.success || r.error.issues[0].path).toEqual(['email'])
  })

  it('rejects a malformed email', () => {
    const r = checkEmailSchema.safeParse({ email: 'not-an-email' })
    expect(r.success).toBe(false)
    expect(r.success || r.error.issues[0].path).toEqual(['email'])
  })

  it('rejects an empty email', () => {
    const r = checkEmailSchema.safeParse({ email: '' })
    expect(r.success).toBe(false)
  })
})
