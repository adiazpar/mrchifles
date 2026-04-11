import { db, businesses } from '@/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { canManageBusiness } from '@/lib/business-auth'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'

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

  return successResponse({
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
    return errorResponse(ApiMessageCode.FORBIDDEN, 403)
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

  return successResponse({
    settings: {
      defaultCategoryId: defaultCategoryId ?? null,
      sortPreference: sortPreference ?? null,
    },
  })
})
