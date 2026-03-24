import { NextResponse } from 'next/server'
import { db, users, inviteCodes } from '@/db'
import { eq, and, gt } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/simple-auth'

/**
 * GET /api/team
 *
 * Get team members and active invite codes for the current business.
 */
export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all team members for this business
    const teamMembers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.businessId, session.businessId))

    // Get active (unused, non-expired) invite codes if user is owner
    let activeInviteCodes: Array<{
      id: string
      code: string
      role: 'partner' | 'employee'
      expiresAt: Date
      createdAt: Date
    }> = []

    if (session.role === 'owner') {
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
            eq(inviteCodes.businessId, session.businessId),
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
    console.error('Get team error:', error)
    return NextResponse.json(
      { error: 'Failed to get team' },
      { status: 500 }
    )
  }
}
