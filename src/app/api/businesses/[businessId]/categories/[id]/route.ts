import { db, productCategories, products, businesses } from '@/db'
import { eq, and } from 'drizzle-orm'
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

  // Get count of products using this category for the response
  const productsWithCategory = await db
    .select()
    .from(products)
    .where(eq(products.categoryId, id))

  // Clear categoryId from products
  await db
    .update(products)
    .set({ categoryId: null })
    .where(eq(products.categoryId, id))

  // Clear defaultCategoryId from business if this was the default
  await db
    .update(businesses)
    .set({ defaultCategoryId: null })
    .where(eq(businesses.defaultCategoryId, id))

  // Delete the category
  await db
    .delete(productCategories)
    .where(eq(productCategories.id, id))

  return successResponse({ affectedProducts: productsWithCategory.length })
})
