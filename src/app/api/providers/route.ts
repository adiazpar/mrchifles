import { NextRequest, NextResponse } from 'next/server'
import { db, providers } from '@/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'

const createProviderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().nullable().optional(),
  email: z.string().email('Invalid email').nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().default(true),
})

/**
 * GET /api/providers
 *
 * List all providers for the current business.
 */
export async function GET() {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const providersList = await db
      .select()
      .from(providers)
      .where(eq(providers.businessId, session.businessId))

    return NextResponse.json({
      success: true,
      providers: providersList,
    })
  } catch (error) {
    console.error('Get providers error:', error)
    return NextResponse.json(
      { error: 'Failed to get providers' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/providers
 *
 * Create a new provider.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only partners and owners can create providers
    if (session.role === 'employee') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createProviderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, phone, email, notes, active } = validation.data

    const providerId = nanoid()
    const now = new Date()

    await db.insert(providers).values({
      id: providerId,
      businessId: session.businessId,
      name,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      active,
      createdAt: now,
      updatedAt: now,
    })

    const [newProvider] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, providerId))
      .limit(1)

    return NextResponse.json({
      success: true,
      provider: newProvider,
    })
  } catch (error) {
    console.error('Create provider error:', error)
    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    )
  }
}
