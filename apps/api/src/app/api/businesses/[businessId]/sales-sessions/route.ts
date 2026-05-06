import { db, salesSessions } from '@/db'
import { and, eq, isNotNull, desc, lt, or } from 'drizzle-orm'
import { withBusinessAuth, successResponse } from '@/lib/api-middleware'
import type { SalesSession } from '@kasero/shared/types/sale'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

/**
 * GET /api/businesses/[businessId]/sales-sessions
 *
 * Paged list of CLOSED sessions. Excludes the open session (use /current).
 * Keyset pagination on (closedAt DESC, id DESC).
 */
export const GET = withBusinessAuth(async (request, access) => {
  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get('limit')
  const cursorParam = searchParams.get('cursor')

  const parsedLimit = limitParam ? parseInt(limitParam, 10) : NaN
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(1, parsedLimit), MAX_LIMIT)
    : DEFAULT_LIMIT

  const conditions = [
    eq(salesSessions.businessId, access.businessId),
    isNotNull(salesSessions.closedAt),
  ]

  if (cursorParam) {
    const cursorRow = await db
      .select({ closedAt: salesSessions.closedAt, id: salesSessions.id })
      .from(salesSessions)
      .where(
        and(
          eq(salesSessions.id, cursorParam),
          eq(salesSessions.businessId, access.businessId),
        ),
      )
      .get()

    if (cursorRow && cursorRow.closedAt) {
      conditions.push(
        or(
          lt(salesSessions.closedAt, cursorRow.closedAt),
          and(eq(salesSessions.closedAt, cursorRow.closedAt), lt(salesSessions.id, cursorRow.id)),
        )!,
      )
    }
  }

  const rows = await db
    .select()
    .from(salesSessions)
    .where(and(...conditions))
    .orderBy(desc(salesSessions.closedAt), desc(salesSessions.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? slice[slice.length - 1].id : null

  const sessions: SalesSession[] = slice.map(serialize)

  return successResponse({ sessions, nextCursor })
})

function serialize(row: typeof salesSessions.$inferSelect): SalesSession {
  return {
    id: row.id,
    openedAt: row.openedAt.toISOString(),
    openedByUserId: row.openedByUserId,
    startingCash: row.startingCash,
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    closedByUserId: row.closedByUserId,
    countedCash: row.countedCash,
    salesCount: row.salesCount,
    salesTotal: row.salesTotal,
    cashSalesTotal: row.cashSalesTotal,
    expectedCash: row.expectedCash,
    variance: row.variance,
    notes: row.notes,
  }
}
