import { NextRequest, NextResponse } from 'next/server'
import { db, inviteCodes, businesses, businessUsers } from '@/db'
import { eq, and, gt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { getCurrentUser } from '@/lib/simple-auth'
import { validationError, errorResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'

const joinSchema = z.object({
  code: Schemas.code(),
})

/**
 * POST /api/invite/join
 *
 * Joins the authenticated user to a business using an invite code.
 * Creates a business_users membership entry.
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
    }

    const body = await request.json()
    const validation = joinSchema.safeParse(body)

    if (!validation.success) {
      return validationError(validation)
    }

    const { code } = validation.data
    const now = new Date()

    // Find the invite code
    const invite = await db
      .select({
        id: inviteCodes.id,
        code: inviteCodes.code,
        role: inviteCodes.role,
        expiresAt: inviteCodes.expiresAt,
        businessId: inviteCodes.businessId,
        businessName: businesses.name,
      })
      .from(inviteCodes)
      .innerJoin(businesses, eq(inviteCodes.businessId, businesses.id))
      .where(
        and(
          eq(inviteCodes.code, code),
          sql`${inviteCodes.usedBy} IS NULL`,
          gt(inviteCodes.expiresAt, now)
        )
      )
      .get()

    if (!invite) {
      // 200 with success:false so the client renders the error inline
      return NextResponse.json({
        success: false,
        messageCode: ApiMessageCode.INVITE_INVALID_OR_EXPIRED,
      })
    }

    // Check if user is already a member of this business
    const existingMembership = await db
      .select({ id: businessUsers.id })
      .from(businessUsers)
      .where(
        and(
          eq(businessUsers.userId, user.userId),
          eq(businessUsers.businessId, invite.businessId)
        )
      )
      .get()

    if (existingMembership) {
      return NextResponse.json({
        success: false,
        messageCode: ApiMessageCode.INVITE_ALREADY_MEMBER,
      })
    }

    // Create business_users membership
    const membershipId = nanoid()
    await db.insert(businessUsers).values({
      id: membershipId,
      userId: user.userId,
      businessId: invite.businessId,
      role: invite.role,
      status: 'active',
      createdAt: now,
    })

    // Mark invite code as used
    await db
      .update(inviteCodes)
      .set({
        usedBy: user.userId,
        usedAt: now,
      })
      .where(eq(inviteCodes.id, invite.id))

    return NextResponse.json({
      success: true,
      businessId: invite.businessId,
      businessName: invite.businessName,
      role: invite.role,
    })
  } catch (error) {
    console.error('Join business error:', error)
    return NextResponse.json(
      {
        success: false,
        messageCode: ApiMessageCode.INVITE_JOIN_FAILED,
      },
      { status: 500 },
    )
  }
}
