import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'

const changeRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['partner', 'employee']),
})

/**
 * POST /api/users/change-role
 *
 * Change user role (partner/employee).
 * Only owners can change roles, and they can't change another owner's role.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only owners can change roles
    if (session.role !== 'owner') {
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
    if (userId === session.userId) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      )
    }

    // Get target user to check they're not an owner
    const [targetUser] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.businessId, session.businessId)
        )
      )
      .limit(1)

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (targetUser.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change the owner\'s role' },
        { status: 400 }
      )
    }

    // Update user role
    const now = new Date()
    await db
      .update(users)
      .set({
        role,
        updatedAt: now,
      })
      .where(eq(users.id, userId))

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Change role error:', error)
    return NextResponse.json(
      { error: 'Failed to change user role' },
      { status: 500 }
    )
  }
}
