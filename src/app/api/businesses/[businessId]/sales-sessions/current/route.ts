import { db, salesSessions } from '@/db'
import { and, eq, isNull } from 'drizzle-orm'
import { withBusinessAuth, successResponse } from '@/lib/api-middleware'
import type { SalesSession } from '@/types/sale'

/**
 * GET /api/businesses/[businessId]/sales-sessions/current
 *
 * Returns the currently open session for the business, or null. Any active
 * member can read.
 */
export const GET = withBusinessAuth(async (_request, access) => {
  const row = await db
    .select()
    .from(salesSessions)
    .where(
      and(
        eq(salesSessions.businessId, access.businessId),
        isNull(salesSessions.closedAt),
      ),
    )
    .get()

  if (!row) {
    return successResponse({ session: null })
  }

  const session: SalesSession = serialize(row)
  return successResponse({ session })
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
