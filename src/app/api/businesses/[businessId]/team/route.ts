import { NextRequest, NextResponse } from 'next/server'
import { db, businessUsers, users, inviteCodes } from '@/db'
import { eq, and, gt } from 'drizzle-orm'
import { requireBusinessAccess, isOwner } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

/**
 * GET /api/businesses/[businessId]/team
 *
 * Get team members and active invite codes for the business.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Get all team members for this business via business_users join
    const teamMembers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: businessUsers.role,
        status: businessUsers.status,
        createdAt: users.createdAt,
        joinedAt: businessUsers.joinedAt,
      })
      .from(businessUsers)
      .innerJoin(users, eq(businessUsers.userId, users.id))
      .where(eq(businessUsers.businessId, access.businessId))

    // Get active (unused, non-expired) invite codes if user is owner
    let activeInviteCodes: Array<{
      id: string
      code: string
      role: 'partner' | 'employee'
      expiresAt: Date
      createdAt: Date
    }> = []

    if (isOwner(access.role)) {
      const now = new Date()
      activeInviteCodes = await db
        .select({
          id: inviteCodes.id,
          code: inviteCodes.code,
          role: inviteCodes.role,
          expiresAt: inviteCodes.expiresAt,
          createdAt: inviteCodes.createdAt,
        })
        .from(inviteCodes)
        .where(
          and(
            eq(inviteCodes.businessId, access.businessId),
            eq(inviteCodes.used, false),
            gt(inviteCodes.expiresAt, now)
          )
        )
    }

    return NextResponse.json({
      teamMembers,
      inviteCodes: activeInviteCodes,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Get team error:', error)
    return NextResponse.json(
      { error: 'Failed to get team' },
      { status: 500 }
    )
  }
}
