import { NextRequest, NextResponse } from 'next/server'
import { db, inviteCodes } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { requireBusinessAccess, isOwner } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

const deleteInviteSchema = z.object({
  id: z.string().min(1),
})

/**
 * POST /api/businesses/[businessId]/invite/delete
 *
 * Delete an invite code.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Only owners can delete invites
    if (!isOwner(access.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
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
          eq(inviteCodes.businessId, access.businessId)
        )
      )

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Delete invite error:', error)
    return NextResponse.json(
      { error: 'Failed to delete invite code' },
      { status: 500 }
    )
  }
}
