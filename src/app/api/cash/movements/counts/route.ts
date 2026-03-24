import { NextResponse } from 'next/server'
import { db, cashMovements, cashSessions } from '@/db'
import { eq, sql } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/simple-auth'

/**
 * GET /api/cash/movements/counts
 *
 * Get movement counts per session for the current business.
 */
export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all session IDs for this business
    const businessSessions = await db
      .select({ id: cashSessions.id })
      .from(cashSessions)
      .where(eq(cashSessions.businessId, session.businessId))

    const sessionIds = businessSessions.map(s => s.id)

    if (sessionIds.length === 0) {
      return NextResponse.json({
        success: true,
        counts: {},
      })
    }

    // Count movements per session
    const movementCountsResult = await db
      .select({
        sessionId: cashMovements.sessionId,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(cashMovements)
      .where(sql`${cashMovements.sessionId} IN ${sessionIds}`)
      .groupBy(cashMovements.sessionId)

    // Convert to Record<string, number>
    const counts: Record<string, number> = {}
    for (const row of movementCountsResult) {
      counts[row.sessionId] = Number(row.count)
    }

    return NextResponse.json({
      success: true,
      counts,
    })
  } catch (error) {
    console.error('Get movement counts error:', error)
    return NextResponse.json(
      { error: 'Failed to get movement counts' },
      { status: 500 }
    )
  }
}
