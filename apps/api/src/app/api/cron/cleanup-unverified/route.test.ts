import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock db lazily: each test sets the response. The handler builds a
// select chain ending in .where(...) and TWO delete chains ending in
// .where(...) — one for the verification table, one for the users table.
// The mocked db routes deletes by the schema-object reference passed to
// `db.delete(...)` so each test can stage independent results.
const selectChainResult = vi.fn()
const verificationDeleteResult = vi.fn()
const usersDeleteResult = vi.fn()

const verificationRef = {
  id: 'verification.id',
  identifier: 'verification.identifier',
  value: 'verification.value',
  expiresAt: 'verification.expires_at',
  createdAt: 'verification.created_at',
  updatedAt: 'verification.updated_at',
}
const usersRef = { id: 'users.id', emailVerified: 'users.email_verified', createdAt: 'users.created_at' }
const businessUsersRef = { userId: 'business_users.user_id', status: 'business_users.status', id: 'business_users.id' }

vi.mock('@/db', () => {
  const select = () => ({
    from: () => ({
      leftJoin: () => ({
        where: (...args: unknown[]) => selectChainResult(...args),
      }),
    }),
  })
  const del = (table: unknown) => ({
    where: (...args: unknown[]) => {
      if (table === verificationRef) return verificationDeleteResult(...args)
      return usersDeleteResult(...args)
    },
  })
  return {
    db: { select, delete: del },
    users: usersRef,
    businessUsers: businessUsersRef,
    verification: verificationRef,
  }
})

vi.mock('@kasero/shared/db/schema', () => ({
  users: usersRef,
  businessUsers: businessUsersRef,
  verification: verificationRef,
}))

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  selectChainResult.mockReset()
  verificationDeleteResult.mockReset()
  usersDeleteResult.mockReset()
  // Default: no expired verifications so existing tests stay focused on
  // the user-deletion path. Individual tests override as needed.
  verificationDeleteResult.mockResolvedValue({ rowsAffected: 0 })
})

describe('cleanup-unverified route', () => {
  it('rejects without authorization header (401)', async () => {
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/cron/cleanup-unverified', { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  it('rejects with wrong secret (401)', async () => {
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/cron/cleanup-unverified', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong' },
    }))
    expect(res.status).toBe(401)
  })

  it('accepts valid secret and returns 0 when no candidates', async () => {
    selectChainResult.mockResolvedValueOnce([])
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/cron/cleanup-unverified', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deletedCount).toBe(0)
    expect(body.verificationsDeleted).toBe(0)
    expect(usersDeleteResult).not.toHaveBeenCalled()
  })

  it('deletes candidates when present', async () => {
    selectChainResult.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
    usersDeleteResult.mockResolvedValueOnce({ rowsAffected: 2 })
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/cron/cleanup-unverified', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deletedCount).toBe(2)
    expect(usersDeleteResult).toHaveBeenCalledTimes(1)
  })

  it('prunes expired verification rows and reports the count', async () => {
    // No unverified-user candidates so the user-deletion branch is a
    // no-op; this test isolates the verification cleanup path.
    selectChainResult.mockResolvedValueOnce([])
    verificationDeleteResult.mockResolvedValueOnce({ rowsAffected: 3 })
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/cron/cleanup-unverified', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.verificationsDeleted).toBe(3)
    expect(body.deletedCount).toBe(0)
    expect(verificationDeleteResult).toHaveBeenCalledTimes(1)
  })

  it('returns verificationsDeleted: 0 when no expired rows exist', async () => {
    selectChainResult.mockResolvedValueOnce([])
    // beforeEach default already resolves to { rowsAffected: 0 }
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/cron/cleanup-unverified', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.verificationsDeleted).toBe(0)
    expect(verificationDeleteResult).toHaveBeenCalledTimes(1)
  })

  it('runs both cleanups on the same invocation', async () => {
    selectChainResult.mockResolvedValueOnce([{ id: 'a' }])
    usersDeleteResult.mockResolvedValueOnce({ rowsAffected: 1 })
    verificationDeleteResult.mockResolvedValueOnce({ rowsAffected: 5 })
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/cron/cleanup-unverified', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deletedCount).toBe(1)
    expect(body.verificationsDeleted).toBe(5)
  })

  it('GET returns 405', async () => {
    const { GET } = await import('./route')
    const res = await GET()
    expect(res.status).toBe(405)
  })

  it('treats missing CRON_SECRET in env as never-matching (401 always)', async () => {
    delete process.env.CRON_SECRET
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/cron/cleanup-unverified', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    }))
    expect(res.status).toBe(401)
  })
})
