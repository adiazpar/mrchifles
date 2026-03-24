import { NextResponse } from 'next/server'
import { db, ownershipTransfers, users } from '@/db'
import { eq, and, or } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/simple-auth'

/**
 * GET /api/transfer/incoming
 *
 * Get any incoming ownership transfer for the current user (for non-owners).
 * Looks for transfers where toEmail matches the user's email.
 */
export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's email
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find pending or accepted transfer to this user's email
    const [transfer] = await db
      .select()
      .from(ownershipTransfers)
      .where(
        and(
          eq(ownershipTransfers.toEmail, currentUser.email),
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

    // Get sender info
    let fromUser = null
    const [sender] = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, transfer.fromUser))
      .limit(1)

    fromUser = sender || null

    return NextResponse.json({
      success: true,
      transfer: {
        code: transfer.code,
        fromUser,
        status: transfer.status,
        expiresAt: transfer.expiresAt instanceof Date
          ? transfer.expiresAt.toISOString()
          : transfer.expiresAt,
      },
    })
  } catch (error) {
    console.error('Get incoming transfer error:', error)
    return NextResponse.json(
      { error: 'Failed to get transfer' },
      { status: 500 }
    )
  }
}
