import { NextRequest, NextResponse } from 'next/server'
import { db, ownershipTransfers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'

const cancelSchema = z.object({
  code: z.string().min(1, 'Code is required'),
})

/**
 * POST /api/transfer/cancel
 *
 * Cancel a pending ownership transfer.
 * Only the owner who initiated the transfer can cancel it.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = cancelSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { code } = validation.data

    // Find the transfer
    const [transfer] = await db
      .select()
      .from(ownershipTransfers)
      .where(
        and(
          eq(ownershipTransfers.code, code),
          eq(ownershipTransfers.fromUser, session.userId)
        )
      )
      .limit(1)

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      )
    }

    // Can only cancel pending or accepted transfers
    if (transfer.status !== 'pending' && transfer.status !== 'accepted') {
      return NextResponse.json(
        { error: 'This transfer cannot be cancelled' },
        { status: 400 }
      )
    }

    // Update to cancelled
    await db
      .update(ownershipTransfers)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(ownershipTransfers.id, transfer.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Transfer cancel error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel transfer' },
      { status: 500 }
    )
  }
}
