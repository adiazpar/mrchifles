import { db, productCategories, products, businesses } from '@/db'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { canManageBusiness } from '@/lib/business-auth'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'

const updateCategorySchema = z.object({
  name: Schemas.name().max(50),
})

/**
 * PATCH /api/businesses/[businessId]/categories/[id]
 *
 * Update a product category.
 */
export const PATCH = withBusinessAuth(async (request, access, routeParams) => {
  const id = routeParams?.id
  if (!id) {
    return errorResponse(ApiMessageCode.CATEGORY_ID_REQUIRED, 400)
  }

  // Only partners and owners can update categories
  if (!canManageBusiness(access.role)) {
    return errorResponse(ApiMessageCode.FORBIDDEN, 403)
  }

  // Verify the category belongs to this business
  const [existingCategory] = await db
    .select()
    .from(productCategories)
    .where(and(
      eq(productCategories.id, id),
      eq(productCategories.businessId, access.businessId)
    ))
    .limit(1)

  if (!existingCategory) {
    return errorResponse(ApiMessageCode.CATEGORY_NOT_FOUND, 404)
  }

  const body = await request.json()
  const validation = updateCategorySchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { name } = validation.data

  await db
    .update(productCategories)
    .set({
      name: name.trim(),
    })
    .where(eq(productCategories.id, id))

  const [updatedCategory] = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.id, id))
    .limit(1)

  return successResponse({ category: updatedCategory })
})

/**
 * DELETE /api/businesses/[businessId]/categories/[id]
 *
 * Delete a product category.
 * Products with this category will have their categoryId set to null.
 */
export const DELETE = withBusinessAuth(async (request, access, routeParams) => {
  const id = routeParams?.id
  if (!id) {
    return errorResponse(ApiMessageCode.CATEGORY_ID_REQUIRED, 400)
  }

  // Only partners and owners can delete categories
  if (!canManageBusiness(access.role)) {
    return errorResponse(ApiMessageCode.FORBIDDEN, 403)
  }

  // Verify the category belongs to this business
  const [existingCategory] = await db
    .select()
    .from(productCategories)
    .where(and(
      eq(productCategories.id, id),
      eq(productCategories.businessId, access.businessId)
    ))
    .limit(1)

  if (!existingCategory) {
    return errorResponse(ApiMessageCode.CATEGORY_NOT_FOUND, 404)
  }

  // Narrow count aggregate instead of pulling every product row (which
  // includes the base64 icon column — MBs of bandwidth per call on
  // larger catalogs).
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.categoryId, id))
  const affectedProducts = Number(countRow?.count ?? 0)

  // Atomic batch: null out the categoryId on products, null out the
  // defaultCategoryId on the business if set, then delete the category
  // itself. Non-atomic sequential writes could previously leave the
  // business pointing at a soon-to-be-deleted category.
  await db.batch([
    db.update(products).set({ categoryId: null }).where(eq(products.categoryId, id)),
    db.update(businesses).set({ defaultCategoryId: null }).where(eq(businesses.defaultCategoryId, id)),
    db.delete(productCategories).where(eq(productCategories.id, id)),
  ])

  return successResponse({ affectedProducts })
})
