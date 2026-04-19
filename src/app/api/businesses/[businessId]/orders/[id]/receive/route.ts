import { db, orders, orderItems, products } from '@/db'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'

const receiveOrderSchema = z.object({
  receivedQuantities: z.record(z.string(), z.number().int().min(0)),
})

/**
 * POST /api/businesses/[businessId]/orders/[id]/receive
 *
 * Receive an order and update product stock.
 */
export const POST = withBusinessAuth(async (request, access, routeParams) => {
  const id = routeParams?.id
  if (!id) {
    return errorResponse(ApiMessageCode.ORDER_ID_REQUIRED, 400)
  }

  // Verify order exists and belongs to business
  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, id),
        eq(orders.businessId, access.businessId)
      )
    )
    .limit(1)

  if (!existingOrder) {
    return errorResponse(ApiMessageCode.ORDER_NOT_FOUND, 404)
  }

  if (existingOrder.status === 'received') {
    return errorResponse(ApiMessageCode.ORDER_ALREADY_RECEIVED, 400)
  }

  const body = await request.json()
  const validation = receiveOrderSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { receivedQuantities } = validation.data

  // Get order items
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))

  const now = new Date()

  // Update product stock AND persist receivedQuantity for each item
  for (const item of items) {
    const receivedQty = receivedQuantities[item.id] ?? item.quantity

    await db
      .update(orderItems)
      .set({ receivedQuantity: receivedQty })
      .where(eq(orderItems.id, item.id))

    if (receivedQty > 0 && item.productId) {
      await db
        .update(products)
        .set({
          stock: sql`${products.stock} + ${receivedQty}`,
        })
        .where(eq(products.id, item.productId))
    }
  }

  // Update order status + stamp who did the receiving.
  await db
    .update(orders)
    .set({
      status: 'received',
      receivedDate: now,
      receivedByUserId: access.userId,
    })
    .where(eq(orders.id, id))

  return successResponse({})
})
