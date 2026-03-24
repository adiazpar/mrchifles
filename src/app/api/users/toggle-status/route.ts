import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'

const toggleStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(['active', 'disabled']),
})

/**
 * POST /api/users/toggle-status
 *
 * Toggle user active/disabled status.
 * Only owners can toggle status, and they can't toggle their own status.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only owners can toggle user status
    if (session.role !== 'owner') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const validation = toggleStatusSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { userId, status } = validation.data

    // Can't toggle own status
    if (userId === session.userId) {
      return NextResponse.json(
        { error: 'Cannot change your own status' },
        { status: 400 }
      )
    }

    // Update user status (only if in same business)
    const now = new Date()
    await db
      .update(users)
      .set({
        status,
        updatedAt: now,
      })
      .where(
        and(
          eq(users.id, userId),
          eq(users.businessId, session.businessId)
        )
      )

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Toggle status error:', error)
    return NextResponse.json(
      { error: 'Failed to change user status' },
      { status: 500 }
    )
  }
}
