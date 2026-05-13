import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock db lazily: each test sets the response. The handler builds a
// select chain ending in .where(...) and a delete chain ending in
// .where(...). The mocked db returns a thenable for each.
const selectChainResult = vi.fn()
const deleteChainResult = vi.fn()

vi.mock('@/db', () => {
  const select = () => ({
    from: () => ({
      leftJoin: () => ({
        where: (...args: unknown[]) => selectChainResult(...args),
      }),
    }),
  })
  const del = () => ({
    where: (...args: unknown[]) => deleteChainResult(...args),
  })
  return {
    db: { select, delete: del },
    users: { id: 'users.id', emailVerified: 'users.email_verified', createdAt: 'users.created_at' },
    businessUsers: { userId: 'business_users.user_id', status: 'business_users.status', id: 'business_users.id' },
  }
})

vi.mock('@kasero/shared/db/schema', () => ({
  users: { id: 'users.id', emailVerified: 'users.email_verified', createdAt: 'users.created_at' },
  businessUsers: { userId: 'business_users.user_id', status: 'business_users.status', id: 'business_users.id' },
}))

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  selectChainResult.mockReset()
  deleteChainResult.mockReset()
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
    expect(deleteChainResult).not.toHaveBeenCalled()
  })

  it('deletes candidates when present', async () => {
    selectChainResult.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
    deleteChainResult.mockResolvedValueOnce({ rowsAffected: 2 })
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/cron/cleanup-unverified', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deletedCount).toBe(2)
    expect(deleteChainResult).toHaveBeenCalledTimes(1)
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
