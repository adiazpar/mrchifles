import { NextRequest, NextResponse } from 'next/server'
import { db, inviteCodes } from '@/db'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { requireBusinessAccess, isOwner } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

const regenerateInviteSchema = z.object({
  oldCodeId: z.string().min(1),
  newCode: z.string().length(6).toUpperCase(),
  role: z.enum(['partner', 'employee']),
  expiresAt: z.string().datetime(),
})

/**
 * POST /api/businesses/[businessId]/invite/regenerate
 *
 * Delete old invite code and create a new one.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Only owners can regenerate invites
    if (!isOwner(access.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const validation = regenerateInviteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { oldCodeId, newCode, role, expiresAt } = validation.data

    // Delete old code
    await db
      .delete(inviteCodes)
      .where(
        and(
          eq(inviteCodes.id, oldCodeId),
          eq(inviteCodes.businessId, access.businessId)
        )
      )

    // Create new code
    const newCodeId = nanoid()
    const now = new Date()

    await db.insert(inviteCodes).values({
      id: newCodeId,
      businessId: access.businessId,
      code: newCode,
      role,
      createdBy: access.userId,
      expiresAt: new Date(expiresAt),
      used: false,
      createdAt: now,
    })

    return NextResponse.json({
      success: true,
      id: newCodeId,
      code: newCode,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Regenerate invite error:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate invite code' },
      { status: 500 }
    )
  }
}
