import { db, productCategories } from '@/db'
import { eq, and, inArray, sql } from 'drizzle-orm'
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

  // Verify all categories belong to this business, then apply every
  // reorder in a single UPDATE ... CASE. The CASE form is one atomic
  // round trip regardless of list length, replacing the old
  // Promise.all of N individual UPDATEs that each cost a round trip
  // and left the list half-reordered on mid-sequence failure.
  const cases = sql.join(
    categoryIds.map((id, idx) => sql`WHEN ${id} THEN ${idx + 1}`),
    sql` `,
  )

  const result = await db
    .update(productCategories)
    .set({ sortOrder: sql`CASE ${productCategories.id} ${cases} END` })
    .where(and(
      inArray(productCategories.id, categoryIds),
      eq(productCategories.businessId, access.businessId),
    ))
    .returning({ id: productCategories.id })

  // If fewer rows updated than IDs passed, at least one category was
  // either missing or belonged to another business — reject the whole
  // reorder.
  if (result.length !== categoryIds.length) {
    return errorResponse(ApiMessageCode.CATEGORIES_NOT_FOUND_IN_BUSINESS, 400)
  }

  return successResponse({})
})
