import { NextRequest, NextResponse } from 'next/server'
import { db, cashSessions } from '@/db'
import { eq, and } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/simple-auth'

/**
 * GET /api/cash/sessions/[id]
 *
 * Get a specific cash session.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const [cashSession] = await db
      .select()
      .from(cashSessions)
      .where(
        and(
          eq(cashSessions.id, id),
          eq(cashSessions.businessId, session.businessId)
        )
      )
      .limit(1)

    if (!cashSession) {
      return NextResponse.json(
        { error: 'Cash session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      session: cashSession,
    })
  } catch (error) {
    console.error('Get cash session error:', error)
    return NextResponse.json(
      { error: 'Failed to get cash session' },
      { status: 500 }
    )
  }
}
