import { NextResponse } from 'next/server'
import { db, cashSessions, users } from '@/db'
import { eq, isNull, and } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/simple-auth'

/**
 * GET /api/cash/sessions/current
 *
 * Get the currently open cash session for the business.
 */
export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [openSession] = await db
      .select({
        id: cashSessions.id,
        businessId: cashSessions.businessId,
        openedBy: cashSessions.openedBy,
        closedBy: cashSessions.closedBy,
        openedAt: cashSessions.openedAt,
        closedAt: cashSessions.closedAt,
        openingBalance: cashSessions.openingBalance,
        closingBalance: cashSessions.closingBalance,
        expectedBalance: cashSessions.expectedBalance,
        discrepancy: cashSessions.discrepancy,
        discrepancyNote: cashSessions.discrepancyNote,
        createdAt: cashSessions.createdAt,
        updatedAt: cashSessions.updatedAt,
        openerName: users.name,
      })
      .from(cashSessions)
      .leftJoin(users, eq(cashSessions.openedBy, users.id))
      .where(
        and(
          eq(cashSessions.businessId, session.businessId),
          isNull(cashSessions.closedAt)
        )
      )
      .limit(1)

    if (!openSession) {
      return NextResponse.json({
        success: true,
        session: null,
      })
    }

    return NextResponse.json({
      success: true,
      session: {
        ...openSession,
        opener: openSession.openerName ? { name: openSession.openerName } : null,
      },
    })
  } catch (error) {
    console.error('Get current cash session error:', error)
    return NextResponse.json(
      { error: 'Failed to get current cash session' },
      { status: 500 }
    )
  }
}
