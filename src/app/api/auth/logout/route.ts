import { NextResponse } from 'next/server'
import { clearAuthCookie, getCurrentUser, revokeUserTokens } from '@/lib/simple-auth'
import { errorResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { logServerError } from '@/lib/server-logger'

/**
 * POST /api/auth/logout
 *
 * Clears the auth cookie AND bumps the user's tokensInvalidBefore so
 * any JWT issued before `now` is rejected on next request. Without
 * the server-side revocation, deleting the browser cookie was the
 * only effect of "log out" — a JWT exfiltrated via XSS or a
 * malicious browser extension stayed valid for the rest of its
 * 7-day window.
 *
 * Logout is idempotent: a stale cookie that already failed
 * authentication still gets cleared (defense against half-state
 * UIs), and a missing user is treated as success.
 */
export async function POST() {
  try {
    // getCurrentUser may return null for an already-expired or
    // tampered cookie — that's fine, we just skip the DB write
    // (nothing to revoke). The cookie clear below still happens.
    const session = await getCurrentUser()
    if (session) {
      await revokeUserTokens(session.userId)
    }
    await clearAuthCookie()
    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('auth.logout', error)
    return errorResponse(ApiMessageCode.INTERNAL_ERROR, 500)
  }
}
