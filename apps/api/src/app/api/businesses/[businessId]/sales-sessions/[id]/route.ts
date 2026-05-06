import { db, salesSessions } from '@/db'
import { and, eq } from 'drizzle-orm'
import { withBusinessAuth, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import type { SalesSession } from '@kasero/shared/types/sale'

/**
 * GET /api/businesses/[businessId]/sales-sessions/[id]
 *
 * Single session by id. Returns 404 SESSION_NOT_FOUND if the session
 * doesn't exist OR belongs to a different business.
 */
export const GET = withBusinessAuth(async (_request, access, params) => {
  const id = params.id
  if (!id) return errorResponse(ApiMessageCode.SESSION_NOT_FOUND, 404)

  const row = await db
    .select()
    .from(salesSessions)
    .where(
      and(
        eq(salesSessions.id, id),
        eq(salesSessions.businessId, access.businessId),
      ),
    )
    .get()

  if (!row) return errorResponse(ApiMessageCode.SESSION_NOT_FOUND, 404)

  const session: SalesSession = {
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

  return successResponse({ session })
})
