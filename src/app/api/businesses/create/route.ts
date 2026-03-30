import { NextRequest, NextResponse } from 'next/server'
import { db, businesses, businessUsers } from '@/db'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'
import { validationError } from '@/lib/api-middleware'
import { Schemas } from '@/lib/schemas'
import { getDefaultsForLocale } from '@/lib/locale-config'

const createBusinessSchema = z.object({
  name: Schemas.name().max(100),
  type: Schemas.businessType(),
  locale: Schemas.locale(),
  currency: Schemas.currency().optional(), // Auto-set from locale if not provided
  timezone: Schemas.timezone().optional(), // Auto-set from locale if not provided
  icon: Schemas.businessIcon(),
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

    const { name, type, locale, currency, timezone, icon } = validation.data
    const now = new Date()

    // Get defaults from locale if currency/timezone not explicitly provided
    const localeDefaults = getDefaultsForLocale(locale)
    const finalCurrency = currency || localeDefaults.currency
    const finalTimezone = timezone || localeDefaults.timezone

    // Create the business
    const businessId = nanoid()
    await db.insert(businesses).values({
      id: businessId,
      name: name.trim(),
      ownerId: user.userId,
      type,
      locale,
      currency: finalCurrency,
      timezone: finalTimezone,
      icon: icon || null,
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
