import { db, products } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { canManageBusiness } from '@/lib/business-auth'
import { ApiMessageCode } from '@/lib/api-messages'

const stockSchema = z.object({
  stock: z.number().int().min(0),
})

/**
 * PATCH /api/businesses/[businessId]/products/[id]/stock
 *
 * Adjust product stock.
 */
export const PATCH = withBusinessAuth(async (request, access, routeParams) => {
  // Only partners and owners can adjust stock — employees are read-only.
  if (!canManageBusiness(access.role)) {
    return errorResponse(ApiMessageCode.PRODUCT_FORBIDDEN_NOT_MANAGER, 403)
  }

  const id = routeParams?.id
  if (!id) {
    return errorResponse(ApiMessageCode.PRODUCT_ID_REQUIRED, 400)
  }

  // Verify product exists and belongs to business
  const [existingProduct] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, id),
        eq(products.businessId, access.businessId)
      )
    )
    .limit(1)

  if (!existingProduct) {
    return errorResponse(ApiMessageCode.PRODUCT_NOT_FOUND, 404)
  }

  const body = await request.json()
  const validation = stockSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { stock } = validation.data

  await db
    .update(products)
    .set({
      stock,
    })
    .where(eq(products.id, id))

  return successResponse({ stock })
})
