import { NextRequest, NextResponse } from 'next/server'
import { db, businesses, businessUsers } from '@/db'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'
import { validationError } from '@/lib/api-middleware'
import { Schemas } from '@/lib/schemas'

const createBusinessSchema = z.object({
  name: Schemas.name().max(100),
})

/**
 * POST /api/businesses/create
 *
 * Creates a new business and adds the current user as owner.
 * Any authenticated user can create a business.
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createBusinessSchema.safeParse(body)

    if (!validation.success) {
      return validationError(validation)
    }

    const { name } = validation.data
    const now = new Date()

    // Create the business
    const businessId = nanoid()
    await db.insert(businesses).values({
      id: businessId,
      name: name.trim(),
      ownerId: user.userId,
      createdAt: now,
      updatedAt: now,
    })

    // Create owner membership
    const membershipId = nanoid()
    await db.insert(businessUsers).values({
      id: membershipId,
      userId: user.userId,
      businessId,
      role: 'owner',
      status: 'active',
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      success: true,
      business: {
        id: businessId,
        name: name.trim(),
      },
    })
  } catch (error) {
    console.error('Create business error:', error)
    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    )
  }
}
