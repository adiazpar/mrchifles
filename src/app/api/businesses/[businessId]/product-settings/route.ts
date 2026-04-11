import { NextResponse } from 'next/server'
import { db, businesses } from '@/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { canManageBusiness } from '@/lib/business-auth'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'

const sortPreferenceValues = ['name_asc', 'name_desc', 'price_asc', 'price_desc', 'category', 'stock_asc', 'stock_desc'] as const

const updateSettingsSchema = z.object({
  defaultCategoryId: z.string().nullable().optional(),
  sortPreference: z.enum(sortPreferenceValues).optional(),
})

/**
 * GET /api/businesses/[businessId]/product-settings
 *
 * Get product settings for the business (stored on businesses table).
 */
export const GET = withBusinessAuth(async (request, access) => {
  const [business] = await db
    .select({
      defaultCategoryId: businesses.defaultCategoryId,
      sortPreference: businesses.sortPreference,
    })
    .from(businesses)
    .where(eq(businesses.id, access.businessId))
    .limit(1)

  return NextResponse.json({
    success: true,
    settings: {
      defaultCategoryId: business?.defaultCategoryId ?? null,
      sortPreference: business?.sortPreference ?? 'name_asc',
    },
  })
})

/**
 * PATCH /api/businesses/[businessId]/product-settings
 *
 * Update product settings.
 */
export const PATCH = withBusinessAuth(async (request, access) => {
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden()
  }

  const body = await request.json()
  const validation = updateSettingsSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { defaultCategoryId, sortPreference } = validation.data

  const updateData: Record<string, unknown> = {}
  if (defaultCategoryId !== undefined) {
    updateData.defaultCategoryId = defaultCategoryId
  }
  if (sortPreference !== undefined) {
    updateData.sortPreference = sortPreference
  }

  await db
    .update(businesses)
    .set(updateData)
    .where(eq(businesses.id, access.businessId))

  return NextResponse.json({
    success: true,
    settings: {
      defaultCategoryId: defaultCategoryId ?? null,
      sortPreference: sortPreference ?? null,
    },
  })
})
