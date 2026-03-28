import { NextRequest, NextResponse } from 'next/server'
import { db, ownershipTransfers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { requireBusinessAccess, isOwner } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

const cancelSchema = z.object({
  code: z.string().min(1, 'Code is required'),
})

/**
 * POST /api/businesses/[businessId]/transfer/cancel
 *
 * Cancel a pending ownership transfer.
 * Only the owner who initiated the transfer can cancel it.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Only owners can cancel transfers
    if (!isOwner(access.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
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
          eq(ownershipTransfers.fromUser, access.userId)
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
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Transfer cancel error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel transfer' },
      { status: 500 }
    )
  }
}
