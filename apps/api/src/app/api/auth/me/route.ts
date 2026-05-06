import { NextRequest, NextResponse } from 'next/server'
import { db, users, businessUsers, businesses, inviteCodes, ownershipTransfers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser, clearAuthCookie, verifyPassword } from '@/lib/simple-auth'
import { invalidateAccessCacheForUser } from '@/lib/business-auth'
import { validationError, errorResponse, successResponse, applyRateLimit, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { RateLimits } from '@/lib/rate-limit'
import { logServerError } from '@/lib/server-logger'

/**
 * GET /api/auth/me
 *
 * Get the current authenticated user
 */
export async function GET() {
  try {
    const session = await getCurrentUser()

    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    logServerError('auth.me.get', error)
    return errorResponse(ApiMessageCode.INTERNAL_ERROR, 500)
  }
}

// ============================================================================
// DELETE
// ============================================================================

const deleteSchema = z.object({
  confirmEmail: z.string().min(1),
  // Required reauth. The email-confirmation alone was a typo guard — the
  // user's email is on /api/auth/me GET, so any session cookie + open
  // browser was enough to nuke the account. The password is the actual
  // security gate. .max(128) bounds bcrypt input cost and matches the
  // schema cap policy.
  currentPassword: z.string().min(1).max(128),
})

/**
 * DELETE /api/auth/me
 *
 * Permanently delete the current user's account.
 *
 * Pre-flight: blocks deletion when the user owns any active business.
 * The client must transfer ownership or delete those businesses first.
 * Returns 409 with the list of owned businesses so the client can show
 * a helpful blocked state.
 *
 * Cleanup: business_users rows cascade automatically. Other FK
 * references that don't cascade are handled inline:
 *   - invite_codes.usedBy -> set to null (preserves the row for the
 *     business owner's history)
 *   - ownership_transfers.fromUser -> delete the row (notNull FK; the
 *     transfer can't be honored without the sender)
 *   - ownership_transfers.toUser -> set to null (preserves the row
 *     for the sender's outgoing transfer history)
 *
 * After deletion the auth cookie is cleared. The client is responsible
 * for redirecting (typically to /register).
 */
// 8 KB body is plenty for { confirmEmail, currentPassword }.
const DELETE_MAX_BODY_BYTES = 8 * 1024

export async function DELETE(request: NextRequest) {
  try {
    const oversize = enforceMaxContentLength(request, DELETE_MAX_BODY_BYTES)
    if (oversize) return oversize

    const session = await getCurrentUser()
    if (!session) {
      return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
    }

    // Rate-limit before any password compare so a stolen-cookie attacker
    // can't brute-force the password via this endpoint. Keyed on userId
    // because the attack surface is "I have your cookie" — IP rotation
    // doesn't help the attacker against a per-user counter, and 5 per
    // 15 min is far more than legitimate retry traffic ever needs.
    const rateLimited = await applyRateLimit(
      `delete-account:${session.userId}`,
      RateLimits.login,
    )
    if (rateLimited) return rateLimited

    const body = await request.json()
    const validation = deleteSchema.safeParse(body)
    if (!validation.success) {
      return validationError(validation)
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    if (!user) {
      return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
    }

    // Reauthentication: bcrypt.compare is constant-time and runs before
    // the email-match check so a wrong-password attacker can't infer
    // anything from response timing. On failure return 401 with the
    // existing "incorrect current password" envelope used by the
    // change-password flow.
    const passwordValid = await verifyPassword(
      validation.data.currentPassword,
      user.password,
    )
    if (!passwordValid) {
      return errorResponse(ApiMessageCode.USER_INCORRECT_CURRENT_PASSWORD, 401)
    }

    if (
      validation.data.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()
    ) {
      return errorResponse(ApiMessageCode.USER_DELETE_CONFIRM_EMAIL_MISMATCH, 400)
    }

    const ownedBusinesses = await db
      .select({
        id: businessUsers.businessId,
        name: businesses.name,
      })
      .from(businessUsers)
      .innerJoin(businesses, eq(businessUsers.businessId, businesses.id))
      .where(
        and(
          eq(businessUsers.userId, session.userId),
          eq(businessUsers.role, 'owner'),
          // Audit L-11: do NOT filter by status='active' here. A
          // 'disabled' owner row should still block account
          // deletion; otherwise a corruption / future bug that
          // disables an owner would let them be deleted, leaving
          // the business permanently ownerless. The owner-cannot-
          // be-disabled invariant in toggle-status (Fix 2) makes
          // this state unreachable through the API today, but
          // defense-in-depth is cheap.
        ),
      )

    if (ownedBusinesses.length > 0) {
      return NextResponse.json(
        {
          messageCode: ApiMessageCode.USER_DELETE_OWNS_BUSINESSES,
          ownedBusinesses,
        },
        { status: 409 },
      )
    }

    // All FK cleanup + the final users delete run atomically.
    // Previously four sequential writes; a mid-flight failure left the
    // user half-deleted (memberships cascaded but invite/transfer
    // references still pointed at a now-missing row).
    await db.batch([
      db
        .update(inviteCodes)
        .set({ usedBy: null })
        .where(eq(inviteCodes.usedBy, session.userId)),
      db
        .delete(ownershipTransfers)
        .where(eq(ownershipTransfers.fromUser, session.userId)),
      db
        .update(ownershipTransfers)
        .set({ toUser: null })
        .where(eq(ownershipTransfers.toUser, session.userId)),
      // business_users entries cascade via FK when the user row is deleted.
      db.delete(users).where(eq(users.id, session.userId)),
    ])

    // Drop every cached BusinessAccess that referenced this user. Even
    // though the JWT is cleared below, a lingering or leaked token could
    // otherwise ride the 60-second TTL window.
    invalidateAccessCacheForUser(session.userId)

    // Clear the auth cookie
    await clearAuthCookie()

    return successResponse({}, ApiMessageCode.USER_DELETED)
  } catch (error) {
    logServerError('auth.me.delete', error)
    return errorResponse(ApiMessageCode.USER_DELETE_FAILED, 500)
  }
}
