import { db, productCategories } from '@/db'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { canManageBusiness } from '@/lib/business-auth'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'

const reorderSchema = z.object({
  categoryIds: z.array(z.string()).min(1),
})

/**
 * POST /api/businesses/[businessId]/categories/reorder
 *
 * Update the sort order of categories.
 * The order in the array determines the new sort order.
 */
export const POST = withBusinessAuth(async (request, access) => {
  // Only partners and owners can reorder categories
  if (!canManageBusiness(access.role)) {
    return errorResponse(ApiMessageCode.FORBIDDEN, 403)
  }

  const body = await request.json()
  const validation = reorderSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { categoryIds } = validation.data

  // Verify all categories belong to this business
  const existingCategories = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(and(
      inArray(productCategories.id, categoryIds),
      eq(productCategories.businessId, access.businessId)
    ))

  if (existingCategories.length !== categoryIds.length) {
    return errorResponse(ApiMessageCode.CATEGORIES_NOT_FOUND_IN_BUSINESS, 400)
  }

  // Update sort order for each category
  await Promise.all(
    categoryIds.map((id, index) =>
      db
        .update(productCategories)
        .set({
          sortOrder: index + 1,
        })
        .where(eq(productCategories.id, id))
    )
  )

  return successResponse({})
})
