import 'server-only'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { businessUsers } from '@kasero/shared/db/schema'
import { errorResponse, successResponse, withAuth } from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { and, eq } from 'drizzle-orm'

/**
 * POST /api/account/delete
 *
 * Deletes the current user's account via better-auth's delete-user path.
 * Pre-checks that the user is not still the active owner of any business —
 * the user must transfer ownership or delete the business first. Sessions
 * cascade-delete via the FK from session.user_id to users.id.
 *
 * Wrapped in `withAuth` so the route inherits the project's standard
 * defense-in-depth: same-origin Origin/Referer check, body-size cap, and
 * per-user / per-IP mutation rate limits. better-auth's catch-all at
 * /api/auth/* does NOT apply origin checks when its endpoints are invoked
 * programmatically (auth.api.deleteUser bypasses the router middleware),
 * so the wrapper here is the only second line of CSRF defense on top of
 * the session cookie's SameSite=Lax. Lives at /api/account/delete (not
 * /api/auth/...) to avoid colliding with better-auth's [...all] catch-all.
 */
export const POST = withAuth(async (request, user) => {
  // Block deletion while the user still owns an active business. The
  // single-active-owner invariant means transferring ownership is the
  // user's responsibility before they can delete.
  const ownedActive = await db.query.businessUsers.findFirst({
    where: and(
      eq(businessUsers.userId, user.userId),
      eq(businessUsers.role, 'owner'),
      eq(businessUsers.status, 'active'),
    ),
  })
  if (ownedActive) {
    return errorResponse(ApiMessageCode.CANNOT_DELETE_OWNS_BUSINESS, 409)
  }

  // Delegate to better-auth. Session cookie + DB rows are cleaned up by
  // the plugin; cascade FKs handle business-side membership rows.
  // better-auth's deleteUser endpoint requires a fresh session (it uses
  // sensitiveSessionMiddleware), so callers must either re-authenticate
  // immediately before this request or pass a password — the SPA is
  // responsible for that handshake.
  await auth.api.deleteUser({
    headers: request.headers,
    body: {},
  })

  return successResponse({}, ApiMessageCode.ACCOUNT_DELETED)
})
