import { NextRequest, NextResponse } from 'next/server'
import { db, ownershipTransfers, users, businesses, businessUsers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { requireBusinessAccess, isOwner } from '@/lib/business-auth'
import { verifyPassword } from '@/lib/simple-auth'
import { nanoid } from 'nanoid'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

const confirmSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  password: z.string().min(1, 'Password is required'),
})

/**
 * POST /api/businesses/[businessId]/transfer/confirm
 *
 * Confirm and complete an ownership transfer.
 * The owner must verify their password to complete the transfer.
 * This is the final step after the recipient has accepted.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Only owners can confirm transfers
    if (!isOwner(access.role)) {
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
      .where(eq(users.id, access.userId))
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

    // Perform the ownership transfer
    // 1. Update the old owner's role to 'partner' in business_users
    await db
      .update(businessUsers)
      .set({
        role: 'partner',
        updatedAt: now,
      })
      .where(
        and(
          eq(businessUsers.userId, access.userId),
          eq(businessUsers.businessId, access.businessId)
        )
      )

    // 2. Check if new owner already has a business_users entry
    const [existingMembership] = await db
      .select()
      .from(businessUsers)
      .where(
        and(
          eq(businessUsers.userId, transfer.toUser),
          eq(businessUsers.businessId, access.businessId)
        )
      )
      .limit(1)

    if (existingMembership) {
      // Update existing membership to owner
      await db
        .update(businessUsers)
        .set({
          role: 'owner',
          updatedAt: now,
        })
        .where(eq(businessUsers.id, existingMembership.id))
    } else {
      // Create new business_users entry for new owner
      await db.insert(businessUsers).values({
        id: nanoid(),
        userId: transfer.toUser,
        businessId: access.businessId,
        role: 'owner',
        status: 'active',
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      })
    }

    // 3. Update business owner
    await db
      .update(businesses)
      .set({
        ownerId: transfer.toUser,
        updatedAt: now,
      })
      .where(eq(businesses.id, access.businessId))

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
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Transfer confirm error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm transfer' },
      { status: 500 }
    )
  }
}
