import { db, ownershipTransfers, users } from '@/db'
import { eq, and, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { isOwner } from '@/lib/business-auth'
import { withBusinessAuth, validationError, errorResponse, successResponse, applyRateLimit } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'
import { RateLimits } from '@/lib/rate-limit'

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
    return errorResponse(ApiMessageCode.TRANSFER_FORBIDDEN_NOT_OWNER, 403)
  }

  // Tight rate limit to mitigate the recipient-lookup enumeration surface.
  // An owner legitimately initiates this a handful of times; anything more
  // is almost certainly probing.
  const rateLimited = applyRateLimit(
    `transfer-initiate:${access.userId}`,
    RateLimits.transferInitiate,
  )
  if (rateLimited) return rateLimited

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
    return errorResponse(ApiMessageCode.TRANSFER_CANNOT_SELF, 400)
  }

  // Verify a Kasero user with this email actually exists.
  // We block "invite-via-transfer" because silent dead-ends (owner types the wrong
  // email, transfer expires 24h later with nothing happening) are a worse UX than
  // telling them up front to invite the person to the team first.
  const [recipientUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(sql`LOWER(${users.email})`, toEmail.toLowerCase()))
    .limit(1)

  if (!recipientUser) {
    return errorResponse(ApiMessageCode.TRANSFER_RECIPIENT_NOT_FOUND, 400)
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
    return errorResponse(ApiMessageCode.TRANSFER_PENDING_EXISTS, 400)
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
  })

  return successResponse({
    code,
    expiresAt: expiresAt.toISOString(),
  })
})
