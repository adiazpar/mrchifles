import { db, orders, orderItems, products } from '@/db'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { canManageBusiness } from '@/lib/business-auth'
import { ApiMessageCode } from '@/lib/api-messages'

const receiveOrderSchema = z.object({
  // Per-line received quantities. Capped at 1M to match the create-
  // and edit-order schemas and block pathological MAX_SAFE_INTEGER
  // writes to products.stock.
  receivedQuantities: z.record(z.string(), z.number().int().min(0).max(1_000_000)),
})

/**
 * POST /api/businesses/[businessId]/orders/[id]/receive
 *
 * Receive an order and update product stock.
 */
export const POST = withBusinessAuth(async (request, access, routeParams) => {
  // Only partners and owners can receive an order (it mutates stock).
  if (!canManageBusiness(access.role)) {
    return errorResponse(ApiMessageCode.ORDER_FORBIDDEN_NOT_MANAGER, 403)
  }

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

  // Build every write up front, then run as a single atomic batch.
  // This collapses (2N+1) round trips (per-item item UPDATE + stock
  // UPDATE + final order UPDATE) into 1, and eliminates the
  // mid-loop failure mode where stock was bumped but the order's
  // status was never flipped.
  const statements = []
  for (const item of items) {
    const receivedQty = receivedQuantities[item.id] ?? item.quantity

    statements.push(
      db
        .update(orderItems)
        .set({ receivedQuantity: receivedQty })
        .where(eq(orderItems.id, item.id)),
    )

    if (receivedQty > 0 && item.productId) {
      statements.push(
        db
          .update(products)
          .set({
            stock: sql`${products.stock} + ${receivedQty}`,
          })
          .where(eq(products.id, item.productId)),
      )
    }
  }

  statements.push(
    db
      .update(orders)
      .set({
        status: 'received',
        receivedDate: now,
        receivedByUserId: access.userId,
      })
      .where(eq(orders.id, id)),
  )

  await db.batch(statements as [typeof statements[0], ...typeof statements[0][]])

  return successResponse({})
})
