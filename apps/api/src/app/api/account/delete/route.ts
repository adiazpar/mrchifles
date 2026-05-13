import 'server-only'
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { businessUsers } from '@kasero/shared/db/schema'
import { errorResponse, successResponse } from '@/lib/api-middleware'
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
 * Lives at /api/account/delete (not /api/auth/...) to avoid colliding with
 * better-auth's [...all] catch-all, which owns /api/auth/* after T16.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
  }

  // Block deletion while the user still owns an active business. The
  // single-active-owner invariant means transferring ownership is the
  // user's responsibility before they can delete.
  const ownedActive = await db.query.businessUsers.findFirst({
    where: and(
      eq(businessUsers.userId, session.user.id),
      eq(businessUsers.role, 'owner'),
      eq(businessUsers.status, 'active'),
    ),
  })
  if (ownedActive) {
    return errorResponse(ApiMessageCode.CANNOT_DELETE_OWNS_BUSINESS, 409)
  }

  // Delegate to better-auth. Session cookie + DB rows are cleaned up by
  // the plugin; cascade FKs handle business-side membership rows.
  await auth.api.deleteUser({
    headers: request.headers,
    body: {},
  })

  return successResponse({}, ApiMessageCode.ACCOUNT_DELETED)
}
