import { NextRequest, NextResponse } from 'next/server'
import { db, inviteCodes } from '@/db'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'

const regenerateInviteSchema = z.object({
  oldCodeId: z.string().min(1),
  newCode: z.string().length(6).toUpperCase(),
  role: z.enum(['partner', 'employee']),
  expiresAt: z.string().datetime(),
})

/**
 * POST /api/invite/regenerate
 *
 * Delete old invite code and create a new one.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
          eq(inviteCodes.businessId, session.businessId)
        )
      )

    // Create new code
    const newCodeId = nanoid()
    const now = new Date()

    await db.insert(inviteCodes).values({
      id: newCodeId,
      businessId: session.businessId,
      code: newCode,
      role,
      createdBy: session.userId,
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
    console.error('Regenerate invite error:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate invite code' },
      { status: 500 }
    )
  }
}
