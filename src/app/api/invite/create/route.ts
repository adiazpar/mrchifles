import { NextRequest, NextResponse } from 'next/server'
import { db, inviteCodes } from '@/db'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'

const createInviteSchema = z.object({
  code: z.string().length(6).toUpperCase(),
  role: z.enum(['partner', 'employee']),
  expiresAt: z.string().datetime(),
})

/**
 * POST /api/invite/create
 *
 * Create a new invite code.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createInviteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { code, role, expiresAt } = validation.data

    const inviteId = nanoid()
    const now = new Date()

    await db.insert(inviteCodes).values({
      id: inviteId,
      businessId: session.businessId,
      code,
      role,
      createdBy: session.userId,
      expiresAt: new Date(expiresAt),
      used: false,
      createdAt: now,
    })

    return NextResponse.json({
      success: true,
      id: inviteId,
      code,
    })
  } catch (error) {
    console.error('Create invite error:', error)
    return NextResponse.json(
      { error: 'Failed to create invite code' },
      { status: 500 }
    )
  }
}
