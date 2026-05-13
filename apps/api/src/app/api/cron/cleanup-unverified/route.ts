import { NextResponse } from 'next/server'
import { db } from '@/db'
import { users, businessUsers } from '@kasero/shared/db/schema'
import { and, eq, lt, sql, inArray } from 'drizzle-orm'
import { timingSafeEqual } from 'node:crypto'

/**
 * Daily cleanup of unverified accounts that never completed signup.
 *
 * Guarded by a shared CRON_SECRET (Bearer token). Set in Vercel:
 *   Project -> Settings -> Cron Jobs -> Authorization header
 *
 * Deletes users that satisfy ALL of:
 *   - email_verified = false (never confirmed their address), AND
 *   - createdAt is older than CLEANUP_WINDOW_DAYS (gives the user a real
 *     chance to come back and verify), AND
 *   - has NO active business_users membership (defensive — an unverified
 *     row with an active business is anomalous but we never want the
 *     cron to take down a real owner).
 *
 * Sessions and account rows cascade-delete via FK on users.id. The job is
 * safe to re-run (no-op if there are no candidates).
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

  if (candidates.length === 0) {
    return NextResponse.json({ deletedCount: 0 })
  }

  const ids = candidates.map((c) => c.id)
  const result = await db.delete(users).where(inArray(users.id, ids))
  const deletedCount = (result as { rowsAffected?: number }).rowsAffected ?? ids.length

  console.log('[cron/cleanup-unverified]', {
    cutoff: cutoff.toISOString(),
    deletedCount,
  })

  return NextResponse.json({ deletedCount })
}

export async function GET() {
  return NextResponse.json({ error: 'method not allowed' }, { status: 405 })
}
