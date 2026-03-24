import { NextRequest, NextResponse } from 'next/server'
import { db, ownershipTransfers, users, businesses } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser, verifyPassword } from '@/lib/simple-auth'

const confirmSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  password: z.string().min(1, 'Password is required'),
})

/**
 * POST /api/transfer/confirm
 *
 * Confirm and complete an ownership transfer.
 * The owner must verify their password to complete the transfer.
 * This is the final step after the recipient has accepted.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only owners can confirm transfers
    if (session.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the owner can confirm the transfer' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = confirmSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { code, password } = validation.data

    // Get current user to verify password
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, currentUser.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 401 }
      )
    }

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

    // Must be in accepted status
    if (transfer.status !== 'accepted') {
      return NextResponse.json(
        { error: 'The recipient has not yet accepted the transfer' },
        { status: 400 }
      )
    }

    // Must have a toUser (recipient)
    if (!transfer.toUser) {
      return NextResponse.json(
        { error: 'No recipient for this transfer' },
        { status: 400 }
      )
    }

    const now = new Date()

    // Perform the ownership transfer in a transaction-like manner
    // 1. Update the new owner's role to 'owner' and link to business
    await db
      .update(users)
      .set({
        role: 'owner',
        businessId: session.businessId,
        updatedAt: now,
      })
      .where(eq(users.id, transfer.toUser))

    // 2. Update the old owner's role to 'partner'
    await db
      .update(users)
      .set({
        role: 'partner',
        updatedAt: now,
      })
      .where(eq(users.id, session.userId))

    // 3. Update business owner
    await db
      .update(businesses)
      .set({
        ownerId: transfer.toUser,
        updatedAt: now,
      })
      .where(eq(businesses.id, session.businessId))

    // 4. Mark transfer as completed
    await db
      .update(ownershipTransfers)
      .set({
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(ownershipTransfers.id, transfer.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Transfer confirm error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm transfer' },
      { status: 500 }
    )
  }
}
