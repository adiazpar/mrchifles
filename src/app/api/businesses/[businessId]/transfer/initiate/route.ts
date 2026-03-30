import { NextResponse } from 'next/server'
import { db, ownershipTransfers, users } from '@/db'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { isOwner } from '@/lib/business-auth'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'
import { Schemas } from '@/lib/schemas'

const initiateSchema = z.object({
  toEmail: Schemas.email(),
})

/**
 * Generate a cryptographically secure 6-character uppercase alphanumeric code
 */
function generateTransferCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const randomValues = new Uint32Array(6)
  crypto.getRandomValues(randomValues)
  return Array.from(randomValues, (v) => chars[v % chars.length]).join('')
}

/**
 * POST /api/businesses/[businessId]/transfer/initiate
 *
 * Initiate an ownership transfer to another user.
 * Only the business owner can initiate a transfer.
 */
export const POST = withBusinessAuth(async (request, access) => {
  // Only owners can initiate transfers
  if (!isOwner(access.role)) {
    return HttpResponse.forbidden('Only the owner can transfer the business')
  }

  const body = await request.json()
  const validation = initiateSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { toEmail } = validation.data

  // Can't transfer to yourself
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, access.userId))
    .limit(1)

  if (currentUser?.email === toEmail) {
    return HttpResponse.badRequest('Cannot transfer the business to yourself')
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
    return HttpResponse.badRequest('You already have a pending transfer. Cancel it first.')
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
})
