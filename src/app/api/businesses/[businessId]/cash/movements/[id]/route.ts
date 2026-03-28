import { NextRequest, NextResponse } from 'next/server'
import { db, cashMovements, cashSessions, users } from '@/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireBusinessAccess } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
    id: string
  }>
}

const updateMovementSchema = z.object({
  type: z.enum(['deposit', 'withdrawal']).optional(),
  category: z.enum(['sale', 'bank_withdrawal', 'bank_deposit', 'other']).optional(),
  amount: z.number().positive('Amount must be greater than 0').optional(),
  note: z.string().nullable().optional(),
})

/**
 * PATCH /api/businesses/[businessId]/cash/movements/[id]
 *
 * Update a cash movement.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId, id } = await params
    const access = await requireBusinessAccess(businessId)

    // Find the movement and verify it belongs to a session in this business
    const [movement] = await db
      .select({
        id: cashMovements.id,
        sessionId: cashMovements.sessionId,
        businessId: cashSessions.businessId,
        closedAt: cashSessions.closedAt,
      })
      .from(cashMovements)
      .innerJoin(cashSessions, eq(cashMovements.sessionId, cashSessions.id))
      .where(eq(cashMovements.id, id))
      .limit(1)

    if (!movement || movement.businessId !== access.businessId) {
      return NextResponse.json(
        { error: 'Movement not found' },
        { status: 404 }
      )
    }

    if (movement.closedAt) {
      return NextResponse.json(
        { error: 'Cannot edit a movement from a closed cash drawer' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validation = updateMovementSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (validation.data.type !== undefined) {
      updateData.type = validation.data.type
    }
    if (validation.data.category !== undefined) {
      updateData.category = validation.data.category
    }
    if (validation.data.amount !== undefined) {
      updateData.amount = validation.data.amount
    }
    if (validation.data.note !== undefined) {
      updateData.note = validation.data.note
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No data to update' },
        { status: 400 }
      )
    }

    updateData.editedBy = access.userId
    updateData.updatedAt = new Date()

    await db
      .update(cashMovements)
      .set(updateData)
      .where(eq(cashMovements.id, id))

    const [updatedMovement] = await db
      .select({
        id: cashMovements.id,
        sessionId: cashMovements.sessionId,
        type: cashMovements.type,
        category: cashMovements.category,
        amount: cashMovements.amount,
        note: cashMovements.note,
        saleId: cashMovements.saleId,
        createdBy: cashMovements.createdBy,
        editedBy: cashMovements.editedBy,
        createdAt: cashMovements.createdAt,
        updatedAt: cashMovements.updatedAt,
        creatorName: users.name,
      })
      .from(cashMovements)
      .leftJoin(users, eq(cashMovements.createdBy, users.id))
      .where(eq(cashMovements.id, id))
      .limit(1)

    return NextResponse.json({
      success: true,
      movement: {
        ...updatedMovement,
        creator: updatedMovement.creatorName ? { name: updatedMovement.creatorName } : null,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Update cash movement error:', error)
    return NextResponse.json(
      { error: 'Failed to update cash movement' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/businesses/[businessId]/cash/movements/[id]
 *
 * Delete a cash movement.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId, id } = await params
    const access = await requireBusinessAccess(businessId)

    // Find the movement and verify it belongs to a session in this business
    const [movement] = await db
      .select({
        id: cashMovements.id,
        sessionId: cashMovements.sessionId,
        businessId: cashSessions.businessId,
        closedAt: cashSessions.closedAt,
      })
      .from(cashMovements)
      .innerJoin(cashSessions, eq(cashMovements.sessionId, cashSessions.id))
      .where(eq(cashMovements.id, id))
      .limit(1)

    if (!movement || movement.businessId !== access.businessId) {
      return NextResponse.json(
        { error: 'Movement not found' },
        { status: 404 }
      )
    }

    if (movement.closedAt) {
      return NextResponse.json(
        { error: 'Cannot delete a movement from a closed cash drawer' },
        { status: 400 }
      )
    }

    await db
      .delete(cashMovements)
      .where(eq(cashMovements.id, id))

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Delete cash movement error:', error)
    return NextResponse.json(
      { error: 'Failed to delete cash movement' },
      { status: 500 }
    )
  }
}
