import { NextRequest, NextResponse } from 'next/server'
import { db, cashSessions, users } from '@/db'
import { eq, isNull, and } from 'drizzle-orm'
import { requireBusinessAccess } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

/**
 * GET /api/businesses/[businessId]/cash/sessions/current
 *
 * Get the currently open cash session for the business.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

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
          eq(cashSessions.businessId, access.businessId),
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
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Get current cash session error:', error)
    return NextResponse.json(
      { error: 'Failed to get current cash session' },
      { status: 500 }
    )
  }
}
