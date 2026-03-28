import { NextRequest, NextResponse } from 'next/server'
import { db, inviteCodes } from '@/db'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { requireBusinessAccess, isOwner } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

const createInviteSchema = z.object({
  code: z.string().length(6).toUpperCase(),
  role: z.enum(['partner', 'employee']),
  expiresAt: z.string().datetime(),
})

/**
 * POST /api/businesses/[businessId]/invite/create
 *
 * Create a new invite code.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Only owners can create invites
    if (!isOwner(access.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
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
      businessId: access.businessId,
      code,
      role,
      createdBy: access.userId,
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
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Create invite error:', error)
    return NextResponse.json(
      { error: 'Failed to create invite code' },
      { status: 500 }
    )
  }
}
