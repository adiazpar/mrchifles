import { NextRequest, NextResponse } from 'next/server'
import { db, inviteCodes } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'

const deleteInviteSchema = z.object({
  id: z.string().min(1),
})

/**
 * POST /api/invite/delete
 *
 * Delete an invite code.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = deleteInviteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { id } = validation.data

    // Delete the invite code (only if it belongs to the same business)
    await db
      .delete(inviteCodes)
      .where(
        and(
          eq(inviteCodes.id, id),
          eq(inviteCodes.businessId, session.businessId)
        )
      )

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Delete invite error:', error)
    return NextResponse.json(
      { error: 'Failed to delete invite code' },
      { status: 500 }
    )
  }
}
