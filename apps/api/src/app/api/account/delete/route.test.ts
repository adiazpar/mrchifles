import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * Unit tests for POST /api/account/delete.
 *
 * The plan suggested a full integration harness (makeAuthedRequest /
 * seedUser / clearDb against a real DB) but this repo's existing API
 * route tests (see cron/cleanup-unverified/route.test.ts) all use
 * Vitest mocks against the auth + db boundary — there is no real-DB
 * test harness wired up yet. Building one for a single task is out
 * of scope and would block the rest of the auth refactor, so this
 * file follows the established pattern: mock auth.api + db and
 * exercise every branch of the route handler.
 *
 * Branches covered:
 *   - no session                                    -> 401
 *   - missing otp / missing confirmEmail            -> 400 validation
 *   - confirmEmail mismatch with session user       -> 400 USER_DELETE_CONFIRM_EMAIL_MISMATCH
 *   - verifyEmailOTP rejects                        -> 401 OTP_INVALID
 *   - user still owns an active business            -> 409 USER_DELETE_OWNS_BUSINESSES
 *   - happy path                                    -> 200 ACCOUNT_DELETED + auth.api.deleteUser called
 */

const getSession = vi.fn()
const verifyEmailOTP = vi.fn()
const deleteUser = vi.fn()
const ownedActiveFindFirst = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => getSession(...args),
      verifyEmailOTP: (...args: unknown[]) => verifyEmailOTP(...args),
      deleteUser: (...args: unknown[]) => deleteUser(...args),
    },
  },
}))

vi.mock('@/db', () => ({
  db: {
    query: {
      businessUsers: {
        findFirst: (...args: unknown[]) => ownedActiveFindFirst(...args),
      },
    },
  },
}))

vi.mock('@kasero/shared/db/schema', () => ({
  businessUsers: {
    userId: 'business_users.user_id',
    role: 'business_users.role',
    status: 'business_users.status',
  },
}))

// Disable rate limiting at the env level so the wrapper's per-user /
// per-IP buckets are no-ops for the test run.
vi.mock('@/lib/rate-limit', async () => {
  return {
    checkRateLimit: vi.fn(async () => ({ success: true, resetAt: Date.now() + 60_000 })),
    getClientIp: () => '127.0.0.1',
    RateLimits: {
      userMutation: { window: 60, max: 30 },
      ipMutation: { window: 60, max: 600 },
    },
    UpstashUnavailableError: class UpstashUnavailableError extends Error {},
  }
})

const SESSION_USER = {
  id: 'user-1',
  email: 'me@x.com',
  emailVerified: true,
  name: 'Test User',
  language: 'en-US',
}

function makeRequest(body: unknown): Request {
  const json = JSON.stringify(body)
  return new Request('http://localhost:3000/api/account/delete', {
    method: 'POST',
    body: json,
    headers: {
      'content-type': 'application/json',
      'content-length': String(new TextEncoder().encode(json).length),
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
    },
  })
}

beforeEach(() => {
  getSession.mockReset()
  verifyEmailOTP.mockReset()
  deleteUser.mockReset()
  ownedActiveFindFirst.mockReset()
})

describe('POST /api/account/delete', () => {
  it('rejects without an active session', async () => {
    getSession.mockResolvedValueOnce(null)
    const { POST } = await import('./route')
    const res = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest({ confirmEmail: 'x@x.com', otp: '123456' }) as any,
    )
    expect([401, 403]).toContain(res.status)
    const body = await res.json()
    expect(body.messageCode).toBe('UNAUTHORIZED')
  })

  it('rejects when otp field is missing', async () => {
    getSession.mockResolvedValueOnce({ user: SESSION_USER })
    const { POST } = await import('./route')
    const res = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest({ confirmEmail: 'me@x.com' }) as any,
    )
    expect(res.status).toBe(400)
  })

  it('rejects when confirmEmail does not match the session user', async () => {
    getSession.mockResolvedValueOnce({ user: SESSION_USER })
    const { POST } = await import('./route')
    const res = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest({ confirmEmail: 'other@x.com', otp: '123456' }) as any,
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.messageCode).toBe('USER_DELETE_CONFIRM_EMAIL_MISMATCH')
    // OTP must not be checked when the email mismatch already failed.
    expect(verifyEmailOTP).not.toHaveBeenCalled()
  })

  it('rejects when otp does not match the stored verification', async () => {
    getSession.mockResolvedValueOnce({ user: SESSION_USER })
    verifyEmailOTP.mockRejectedValueOnce(new Error('INVALID_OTP'))
    const { POST } = await import('./route')
    const res = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest({ confirmEmail: 'me@x.com', otp: '000000' }) as any,
    )
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.messageCode).toBe('OTP_INVALID')
    // We must not have moved past the OTP check.
    expect(ownedActiveFindFirst).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('refuses when the user still owns an active business', async () => {
    getSession.mockResolvedValueOnce({ user: SESSION_USER })
    verifyEmailOTP.mockResolvedValueOnce({ status: true })
    ownedActiveFindFirst.mockResolvedValueOnce({ businessId: 'biz-1' })
    const { POST } = await import('./route')
    const res = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest({ confirmEmail: 'me@x.com', otp: '123456' }) as any,
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.messageCode).toBe('USER_DELETE_OWNS_BUSINESSES')
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('deletes the account on the happy path', async () => {
    getSession.mockResolvedValueOnce({ user: SESSION_USER })
    verifyEmailOTP.mockResolvedValueOnce({ status: true })
    ownedActiveFindFirst.mockResolvedValueOnce(undefined)
    deleteUser.mockResolvedValueOnce({ success: true, message: 'User deleted' })
    const { POST } = await import('./route')
    const res = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest({ confirmEmail: 'me@x.com', otp: '123456' }) as any,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messageCode).toBe('ACCOUNT_DELETED')
    expect(verifyEmailOTP).toHaveBeenCalledOnce()
    expect(deleteUser).toHaveBeenCalledOnce()
  })

  it('lowercases confirmEmail before comparing to the session email', async () => {
    // Schemas.email() applies .toLowerCase(); the additional defensive
    // .toLowerCase() in the route makes the comparison case-insensitive
    // either way. Belt-and-suspenders test.
    getSession.mockResolvedValueOnce({
      user: { ...SESSION_USER, email: 'Me@X.com' },
    })
    verifyEmailOTP.mockResolvedValueOnce({ status: true })
    ownedActiveFindFirst.mockResolvedValueOnce(undefined)
    deleteUser.mockResolvedValueOnce({ success: true, message: 'User deleted' })
    const { POST } = await import('./route')
    const res = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest({ confirmEmail: 'ME@x.COM', otp: '123456' }) as any,
    )
    expect(res.status).toBe(200)
  })
})
