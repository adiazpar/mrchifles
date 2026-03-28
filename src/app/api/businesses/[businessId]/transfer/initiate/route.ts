import { NextRequest, NextResponse } from 'next/server'
import { db, ownershipTransfers, users } from '@/db'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { requireBusinessAccess, isOwner } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

const initiateSchema = z.object({
  toEmail: z.string().email('Invalid email'),
})

/**
 * Generate a random 6-character uppercase alphanumeric code
 */
function generateTransferCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * POST /api/businesses/[businessId]/transfer/initiate
 *
 * Initiate an ownership transfer to another user.
 * Only the business owner can initiate a transfer.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Only owners can initiate transfers
    if (!isOwner(access.role)) {
      return NextResponse.json(
        { error: 'Only the owner can transfer the business' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = initiateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { toEmail } = validation.data

    // Can't transfer to yourself
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, access.userId))
      .limit(1)

    if (currentUser?.email === toEmail) {
      return NextResponse.json(
        { error: 'Cannot transfer the business to yourself' },
        { status: 400 }
      )
    }

    // Check for existing pending transfer
    const [existingTransfer] = await db
      .select()
      .from(ownershipTransfers)
      .where(
        and(
          eq(ownershipTransfers.businessId, access.businessId),
          eq(ownershipTransfers.fromUser, access.userId),
          eq(ownershipTransfers.status, 'pending')
        )
      )
      .limit(1)

    if (existingTransfer) {
      return NextResponse.json(
        { error: 'You already have a pending transfer. Cancel it first.' },
        { status: 400 }
      )
    }

    // Generate unique code
    let code = generateTransferCode()
    let attempts = 0
    while (attempts < 10) {
      const [existing] = await db
        .select()
        .from(ownershipTransfers)
        .where(eq(ownershipTransfers.code, code))
        .limit(1)

      if (!existing) break
      code = generateTransferCode()
      attempts++
    }

    const transferId = nanoid()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    await db.insert(ownershipTransfers).values({
      id: transferId,
      businessId: access.businessId,
      code,
      fromUser: access.userId,
      toEmail,
      status: 'pending',
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      success: true,
      code,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Transfer initiate error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate transfer' },
      { status: 500 }
    )
  }
}
