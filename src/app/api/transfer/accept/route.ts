import { NextRequest, NextResponse } from 'next/server'
import { db, ownershipTransfers, users } from '@/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'

const acceptSchema = z.object({
  code: z.string().min(1, 'Code is required'),
})

/**
 * POST /api/transfer/accept
 *
 * Accept an incoming ownership transfer.
 * The recipient must be logged in and their email must match the transfer's toEmail.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = acceptSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { code } = validation.data

    // Get current user's email
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the transfer by code
    const [transfer] = await db
      .select()
      .from(ownershipTransfers)
      .where(eq(ownershipTransfers.code, code))
      .limit(1)

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      )
    }

    // Verify the email matches
    if (transfer.toEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This transfer is not for you' },
        { status: 403 }
      )
    }

    // Check if still pending
    if (transfer.status !== 'pending') {
      return NextResponse.json(
        { error: 'This transfer is no longer available' },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date(transfer.expiresAt) < new Date()) {
      // Mark as expired
      await db
        .update(ownershipTransfers)
        .set({
          status: 'expired',
          updatedAt: new Date(),
        })
        .where(eq(ownershipTransfers.id, transfer.id))

      return NextResponse.json(
        { error: 'This transfer has expired' },
        { status: 400 }
      )
    }

    const now = new Date()

    // Update transfer to accepted
    await db
      .update(ownershipTransfers)
      .set({
        status: 'accepted',
        toUser: session.userId,
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(ownershipTransfers.id, transfer.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Transfer accept error:', error)
    return NextResponse.json(
      { error: 'Failed to accept transfer' },
      { status: 500 }
    )
  }
}
