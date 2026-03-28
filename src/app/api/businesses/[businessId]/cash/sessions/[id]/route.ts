import { NextRequest, NextResponse } from 'next/server'
import { db, cashSessions } from '@/db'
import { eq, and } from 'drizzle-orm'
import { requireBusinessAccess } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
    id: string
  }>
}

/**
 * GET /api/businesses/[businessId]/cash/sessions/[id]
 *
 * Get a specific cash session.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId, id } = await params
    const access = await requireBusinessAccess(businessId)

    const [cashSession] = await db
      .select()
      .from(cashSessions)
      .where(
        and(
          eq(cashSessions.id, id),
          eq(cashSessions.businessId, access.businessId)
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
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Get cash session error:', error)
    return NextResponse.json(
      { error: 'Failed to get cash session' },
      { status: 500 }
    )
  }
}
