import { NextRequest, NextResponse } from 'next/server'
import { db, ownershipTransfers, users } from '@/db'
import { eq, and, or } from 'drizzle-orm'
import { requireBusinessAccess, isOwner } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

/**
 * GET /api/businesses/[businessId]/transfer/pending
 *
 * Get the current user's pending outgoing transfer (for owners).
 * Returns the transfer with recipient info if they've accepted.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Only owners have outgoing transfers
    if (!isOwner(access.role)) {
      return NextResponse.json({
        success: true,
        transfer: null,
      })
    }

    // Find pending or accepted transfer from this user
    const [transfer] = await db
      .select()
      .from(ownershipTransfers)
      .where(
        and(
          eq(ownershipTransfers.fromUser, access.userId),
          or(
            eq(ownershipTransfers.status, 'pending'),
            eq(ownershipTransfers.status, 'accepted')
          )
        )
      )
      .limit(1)

    if (!transfer) {
      return NextResponse.json({
        success: true,
        transfer: null,
      })
    }

    // Check if expired
    if (transfer.status === 'pending' && new Date(transfer.expiresAt) < new Date()) {
      // Mark as expired
      await db
        .update(ownershipTransfers)
        .set({
          status: 'expired',
          updatedAt: new Date(),
        })
        .where(eq(ownershipTransfers.id, transfer.id))

      return NextResponse.json({
        success: true,
        transfer: null,
      })
    }

    // Get recipient user info if they've accepted
    let toUser = null
    if (transfer.toUser) {
      const [recipient] = await db
        .select({
          id: users.id,
          name: users.name,
        })
        .from(users)
        .where(eq(users.id, transfer.toUser))
        .limit(1)

      toUser = recipient || null
    }

    return NextResponse.json({
      success: true,
      transfer: {
        code: transfer.code,
        toEmail: transfer.toEmail,
        status: transfer.status,
        expiresAt: transfer.expiresAt instanceof Date
          ? transfer.expiresAt.toISOString()
          : transfer.expiresAt,
        toUser,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Get pending transfer error:', error)
    return NextResponse.json(
      { error: 'Failed to get transfer' },
      { status: 500 }
    )
  }
}
