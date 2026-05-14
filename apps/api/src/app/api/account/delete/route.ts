import 'server-only'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { businessUsers } from '@kasero/shared/db/schema'
import {
  errorResponse,
  successResponse,
  validationError,
  withAuth,
} from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { Schemas } from '@/lib/schemas'

/**
 * POST /api/account/delete
 *
 * Deletes the current user's account after a fresh email-OTP step-up.
 *
 * Step-up replaces the legacy password re-auth: the user is already
 * signed in (withAuth confirms that), but irreversible actions still
 * require recent proof of mailbox control. The flow on the client is:
 *   1. POST /api/auth/email-otp/send-verification-otp { email, type: 'email-verification' }
 *   2. POST /api/account/delete { confirmEmail, otp }
 * better-auth's verifyEmailOTP consumes the verification row on
 * success, so a captured OTP can't be replayed for a second mutation.
 *
 * The route also confirms `confirmEmail` matches the session user — a
 * defense against the "user types the wrong email by mistake" foot-gun
 * before we hand off to better-auth, and against any future flow that
 * lets one user prompt deletion of a different account.
 *
 * Business-ownership pre-check still applies: the single-active-owner
 * invariant means we refuse to delete anyone who still owns a live
 * business — they must transfer ownership first.
 *
 * Wrapped in `withAuth` for the standard same-origin / body-size /
 * per-user / per-IP guardrails. Lives at /api/account/delete (not
 * /api/auth/...) to avoid colliding with better-auth's [...all]
 * catch-all.
 */
const Body = z.object({
  confirmEmail: Schemas.email(),
  otp: Schemas.code(),
})

export const POST = withAuth(async (request, user) => {
  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) return validationError(parsed)
  const { confirmEmail, otp } = parsed.data

  // 1. Confirm-email matches the session user's email. Cheap guard
  //    against typos AND against any future flow that lets a different
  //    account's email reach this route.
  if (confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
    return errorResponse(ApiMessageCode.USER_DELETE_CONFIRM_EMAIL_MISMATCH, 400)
  }

  // 2. Step-up auth: verify a fresh OTP against the user's own email.
  //    We don't sign them in (they already are) — verifyEmailOTP confirms
  //    mailbox control RIGHT NOW and consumes the verification row.
  //    Wrong / expired / replayed codes throw APIError; translate any
  //    failure to OTP_INVALID so the client surfaces a single,
  //    unambiguous error string.
  try {
    await auth.api.verifyEmailOTP({
      body: { email: user.email, otp },
      headers: request.headers,
    })
  } catch {
    return errorResponse(ApiMessageCode.OTP_INVALID, 401)
  }

  // 3. Block deletion while the user still owns an active business. The
  //    single-active-owner invariant means transferring ownership is the
  //    user's responsibility before they can delete.
  const ownedActive = await db.query.businessUsers.findFirst({
    where: and(
      eq(businessUsers.userId, user.userId),
      eq(businessUsers.role, 'owner'),
      eq(businessUsers.status, 'active'),
    ),
  })
  if (ownedActive) {
    return errorResponse(ApiMessageCode.USER_DELETE_OWNS_BUSINESSES, 409)
  }

  // 4. Hand off to better-auth. Sessions, account rows, business_users
  //    rows all cascade-delete via FKs.
  // better-auth's default `freshAge` gate (24h since session.createdAt) is
  // explicitly disabled in auth.ts via `session.freshAge: 0`. The OTP we
  // just verified is the sole freshness proof for this destructive action
  // — without it, a stolen 6-day-old session could nuke the account.
  await auth.api.deleteUser({ headers: request.headers, body: {} })

  return successResponse({}, ApiMessageCode.ACCOUNT_DELETED)
})
