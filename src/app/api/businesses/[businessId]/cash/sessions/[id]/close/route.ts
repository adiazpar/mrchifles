import { NextRequest, NextResponse } from 'next/server'
import { db, cashSessions } from '@/db'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { requireBusinessAccess } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
    id: string
  }>
}

const closeSessionSchema = z.object({
  closingBalance: z.number().min(0),
  expectedBalance: z.number(),
  discrepancy: z.number(),
  discrepancyNote: z.string().nullable().optional(),
})

/**
 * POST /api/businesses/[businessId]/cash/sessions/[id]/close
 *
 * Close a cash session.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId, id } = await params
    const access = await requireBusinessAccess(businessId)

    // Verify session exists, belongs to business, and is open
    const [cashSession] = await db
      .select()
      .from(cashSessions)
      .where(
        and(
          eq(cashSessions.id, id),
          eq(cashSessions.businessId, access.businessId),
          isNull(cashSessions.closedAt)
        )
      )
      .limit(1)

    if (!cashSession) {
      return NextResponse.json(
        { error: 'Cash session not found or already closed' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = closeSessionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { closingBalance, expectedBalance, discrepancy, discrepancyNote } = validation.data

    const now = new Date()

    await db
      .update(cashSessions)
      .set({
        closedBy: access.userId,
        closedAt: now,
        closingBalance,
        expectedBalance,
        discrepancy,
        discrepancyNote: discrepancyNote || null,
        updatedAt: now,
      })
      .where(eq(cashSessions.id, id))

    const [closedSession] = await db
      .select()
      .from(cashSessions)
      .where(eq(cashSessions.id, id))
      .limit(1)

    return NextResponse.json({
      success: true,
      session: closedSession,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Close cash session error:', error)
    return NextResponse.json(
      { error: 'Failed to close cash drawer' },
      { status: 500 }
    )
  }
}
