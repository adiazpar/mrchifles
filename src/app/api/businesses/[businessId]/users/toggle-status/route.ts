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

const toggleStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(['active', 'disabled']),
})

/**
 * POST /api/businesses/[businessId]/users/toggle-status
 *
 * Toggle user active/disabled status.
 * Only owners can toggle status, and they can't toggle their own status.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Only owners can toggle user status
    if (!isOwner(access.role)) {
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
    if (userId === access.userId) {
      return NextResponse.json(
        { error: 'Cannot change your own status' },
        { status: 400 }
      )
    }

    // Update user status in business_users
    const now = new Date()
    await db
      .update(businessUsers)
      .set({
        status,
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
    console.error('Toggle status error:', error)
    return NextResponse.json(
      { error: 'Failed to change user status' },
      { status: 500 }
    )
  }
}
