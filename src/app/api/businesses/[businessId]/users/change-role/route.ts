import { NextRequest, NextResponse } from 'next/server'
import { db, businessUsers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { requireBusinessAccess, isOwner } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

const changeRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['partner', 'employee']),
})

/**
 * POST /api/businesses/[businessId]/users/change-role
 *
 * Change user role (partner/employee).
 * Only owners can change roles, and they can't change another owner's role.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Only owners can change roles
    if (!isOwner(access.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const validation = changeRoleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { userId, role } = validation.data

    // Can't change own role
    if (userId === access.userId) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      )
    }

    // Get target user's business membership
    const [targetMembership] = await db
      .select()
      .from(businessUsers)
      .where(
        and(
          eq(businessUsers.userId, userId),
          eq(businessUsers.businessId, access.businessId)
        )
      )
      .limit(1)

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'User not found in this business' },
        { status: 404 }
      )
    }

    if (targetMembership.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change the owner\'s role' },
        { status: 400 }
      )
    }

    // Update user role in business_users
    const now = new Date()
    await db
      .update(businessUsers)
      .set({
        role,
        updatedAt: now,
      })
      .where(
        and(
          eq(businessUsers.userId, userId),
          eq(businessUsers.businessId, access.businessId)
        )
      )

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Change role error:', error)
    return NextResponse.json(
      { error: 'Failed to change user role' },
      { status: 500 }
    )
  }
}
