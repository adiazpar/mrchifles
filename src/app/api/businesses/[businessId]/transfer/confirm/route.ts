import { db, ownershipTransfers, users, businessUsers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { isOwner, invalidateAccessCache } from '@/lib/business-auth'
import { verifyPassword } from '@/lib/simple-auth'
import { nanoid } from 'nanoid'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'

const confirmSchema = z.object({
  code: Schemas.code(),
  password: Schemas.password(),
})

/**
 * POST /api/businesses/[businessId]/transfer/confirm
 *
 * Confirm and complete an ownership transfer.
 * The owner must verify their password to complete the transfer.
 * This is the final step after the recipient has accepted.
 */
export const POST = withBusinessAuth(async (request, access) => {
  // Only owners can confirm transfers
  if (!isOwner(access.role)) {
    return errorResponse(ApiMessageCode.TRANSFER_FORBIDDEN_NOT_OWNER, 403)
  }

  const body = await request.json()
  const validation = confirmSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { code, password } = validation.data

  // Get current user to verify password
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, access.userId))
    .limit(1)

  if (!currentUser) {
    return errorResponse(ApiMessageCode.TRANSFER_USER_NOT_FOUND, 404)
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, currentUser.password)
  if (!isValidPassword) {
    return errorResponse(ApiMessageCode.TRANSFER_INCORRECT_PASSWORD, 401)
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
    return errorResponse(ApiMessageCode.TRANSFER_NOT_FOUND, 404)
  }

  // Must be in accepted status
  if (transfer.status !== 'accepted') {
    return errorResponse(ApiMessageCode.TRANSFER_NOT_ACCEPTED_YET, 400)
  }

  // Must have a toUser (recipient)
  if (!transfer.toUser) {
    return errorResponse(ApiMessageCode.TRANSFER_NO_RECIPIENT, 400)
  }

  const now = new Date()

  // Perform the ownership transfer
  // 1. Update the old owner's role to 'partner' in business_users
  await db
    .update(businessUsers)
    .set({
      role: 'partner',
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
      createdAt: now,
    })
  }

  // 3. Mark transfer as completed
  await db
    .update(ownershipTransfers)
    .set({
      status: 'completed',
      completedAt: now,
    })
    .where(eq(ownershipTransfers.id, transfer.id))

  // Invalidate cached access for both users
  invalidateAccessCache(access.userId, access.businessId)
  invalidateAccessCache(transfer.toUser, access.businessId)

  return successResponse({})
})
