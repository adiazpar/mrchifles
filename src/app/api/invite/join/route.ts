import { NextRequest, NextResponse } from 'next/server'
import { db, inviteCodes, businesses, businessUsers } from '@/db'
import { eq, and, gt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { getCurrentUser } from '@/lib/simple-auth'
import { validationError, errorResponse, applyRateLimit } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'
import { RateLimits } from '@/lib/rate-limit'

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

    // Cap join attempts — a 6-char invite code is a brute-force surface
    // even with /validate limited, so the join itself needs its own gate.
    const rateLimited = applyRateLimit(
      `join:${user.userId}`,
      RateLimits.userMutation,
    )
    if (rateLimited) return rateLimited

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

    // Create membership + mark invite as used atomically. Previously two
    // sequential writes — if the membership insert succeeded but the
    // invite update failed, the code would stay usable and the same
    // person (or a friend with the code) could join again.
    const membershipId = nanoid()
    await db.batch([
      db.insert(businessUsers).values({
        id: membershipId,
        userId: user.userId,
        businessId: invite.businessId,
        role: invite.role,
        status: 'active',
        createdAt: now,
      }),
      db
        .update(inviteCodes)
        .set({
          usedBy: user.userId,
        })
        .where(eq(inviteCodes.id, invite.id)),
    ])

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
