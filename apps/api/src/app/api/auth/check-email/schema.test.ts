import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { Schemas } from '../../../../lib/schemas'

const checkEmailSchema = z.object({
  email: Schemas.email(),
})

describe('POST /api/auth/check-email schema', () => {
  it('accepts a valid email and normalizes to lowercase', () => {
    const r = checkEmailSchema.safeParse({ email: 'Foo@Example.COM' })
    expect(r.success).toBe(true)
    expect(r.success && r.data.email).toBe('foo@example.com')
  })

  it('rejects missing email', () => {
    expect(checkEmailSchema.safeParse({}).success).toBe(false)
  })

  it('rejects a malformed email', () => {
    expect(checkEmailSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects an empty email', () => {
    expect(checkEmailSchema.safeParse({ email: '' }).success).toBe(false)
  })
})
