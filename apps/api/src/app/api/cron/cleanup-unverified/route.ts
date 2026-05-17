import { NextResponse } from 'next/server'
import { db } from '@/db'
import { users, businessUsers, verification } from '@kasero/shared/db/schema'
import { and, eq, lt, sql, inArray } from 'drizzle-orm'
import { timingSafeEqual } from 'node:crypto'

/**
 * Daily cleanup of two unrelated tables:
 *
 *   1. Unverified `users` that never completed signup.
 *   2. Expired `verification` rows (email-OTP records past their TTL).
 *
 * Guarded by a shared CRON_SECRET (Bearer token). Set in Vercel:
 *   Project -> Settings -> Cron Jobs -> Authorization header
 *
 * --- Users cleanup ---
 *
 * Deletes users that satisfy ALL of:
 *   - email_verified = false (never confirmed their address), AND
 *   - createdAt is older than CLEANUP_WINDOW_DAYS (gives the user a real
 *     chance to come back and verify), AND
 *   - has NO active business_users membership (defensive — an unverified
 *     row with an active business is anomalous but we never want the
 *     cron to take down a real owner).
 *
 * Sessions and account rows cascade-delete via FK on users.id.
 *
 * --- Verification cleanup ---
 *
 * Email-OTP rows have a 10-minute TTL but better-auth never deletes
 * expired ones — they accumulate forever. We prune anything 1+ hour past
 * `expires_at`; the buffer past the 10-minute OTP TTL is intentional to
 * avoid edge-case races with verify attempts arriving at the last second.
 *
 * Verification records stay in Turso (not Redis) on purpose: better-auth
 * has open bugs around verification under secondary-storage — see
 * #8893 (verification model removed from adapter schema), #4721
 * (email-verified flag not synced), #1368 (email-change cache
 * invalidation). Our change-email route also queries `verification`
 * directly, which would break under any non-SQL backend.
 *
 * The job is safe to re-run (no-op if there are no candidates / no
 * expired verifications). Both cleanups run on every invocation; the
 * JSON response always carries both counters.
 */

const CLEANUP_WINDOW_DAYS = 7

function isAuthorized(request: Request): boolean {
  const header = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!header || !expectedSecret) return false
  const expected = `Bearer ${expectedSecret}`
  const headerBuf = Buffer.from(header)
  const expectedBuf = Buffer.from(expected)
  if (headerBuf.length !== expectedBuf.length) return false
  // Constant-time compare so the auth check doesn't leak the secret
  // length / first-mismatch position via response timing.
  return timingSafeEqual(headerBuf, expectedBuf)
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - CLEANUP_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  // --- 1. Prune expired email-OTP verification rows ---
  // Runs unconditionally (no user-candidates short-circuit). The 10-minute
  // OTP TTL has elapsed by ~50 minutes by the time this cutoff hits — the
  // buffer is to avoid edge-case races with verify attempts arriving at
  // the last second.
  const verificationCutoff = new Date(Date.now() - 60 * 60 * 1000)
  const vResult = await db
    .delete(verification)
    .where(lt(verification.expiresAt, verificationCutoff))
  const verificationsDeleted =
    (vResult as { rowsAffected?: number }).rowsAffected ?? 0

  // --- 2. Prune unverified-stale users ---
  // Find candidate user ids in a single query that left-joins
  // business_users and filters where there is no active membership.
  const candidates = await db
    .select({ id: users.id })
    .from(users)
    .leftJoin(
      businessUsers,
      and(eq(businessUsers.userId, users.id), eq(businessUsers.status, 'active')),
    )
    .where(
      and(
        eq(users.emailVerified, false),
        lt(users.createdAt, cutoff),
        sql`${businessUsers.id} IS NULL`,
      ),
    )

  let deletedCount = 0
  if (candidates.length > 0) {
    const ids = candidates.map((c) => c.id)
    const result = await db.delete(users).where(inArray(users.id, ids))
    deletedCount = (result as { rowsAffected?: number }).rowsAffected ?? ids.length
  }

  // Operational summary — surfaced in Vercel cron logs for monitoring.
  // Uses console.warn (not console.log) because the no-console eslint rule
  // permits warn/error only; the line is informational, not a real warning.
  console.warn('[cron/cleanup-unverified]', {
    cutoff: cutoff.toISOString(),
    verificationCutoff: verificationCutoff.toISOString(),
    deletedCount,
    verificationsDeleted,
  })

  return NextResponse.json({ deletedCount, verificationsDeleted })
}

export async function GET() {
  return NextResponse.json({ error: 'method not allowed' }, { status: 405 })
}
