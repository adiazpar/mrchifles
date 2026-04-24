import { db, orders, orderItems } from '@/db'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { withBusinessAuth, validationError, errorResponse, successResponse, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { canManageBusiness } from '@/lib/business-auth'
import { Schemas } from '@/lib/schemas'

const orderItemSchema = z.object({
  productId: Schemas.id(),
  productName: Schemas.name(),
  // Mirrors the cap on order create. 1M units of a single line is far
  // beyond any legit purchase order from a small business.
  quantity: z.number().int().positive().max(1_000_000),
  unitCost: z.number().nonnegative().max(1_000_000_000).optional().nullable(),
})

/**
 * PATCH /api/businesses/[businessId]/orders/[id]
 *
 * Update an order and its items.
 */
// Mirrors the create-route cap (15 MB) — receipt upload is the only large field.
const PATCH_MAX_BODY_BYTES = 15 * 1024 * 1024

export const PATCH = withBusinessAuth(async (request, access, routeParams) => {
  // Only partners and owners can modify orders
  if (!canManageBusiness(access.role)) {
    return errorResponse(ApiMessageCode.ORDER_FORBIDDEN_NOT_MANAGER, 403)
  }

  const id = routeParams?.id
  if (!id) {
    return errorResponse(ApiMessageCode.ORDER_ID_REQUIRED, 400)
  }

  const oversize = enforceMaxContentLength(request, PATCH_MAX_BODY_BYTES)
  if (oversize) return oversize

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
    return errorResponse(ApiMessageCode.ORDER_CANNOT_EDIT_RECEIVED, 400)
  }

  const MAX_RECEIPT_BYTES = 5 * 1024 * 1024
  const ACCEPTED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']

  const formData = await request.formData()
  const totalStr = formData.get('total') as string | null
  const estimatedArrivalStr = formData.get('estimatedArrival') as string | null
  const providerId = formData.get('providerId') as string | null
  const itemsJson = formData.get('items') as string | null
  const receiptFile = formData.get('receipt') as File | null

  // Validate receipt file if provided
  if (receiptFile) {
    if (!ACCEPTED_RECEIPT_TYPES.includes(receiptFile.type)) {
      return errorResponse(ApiMessageCode.VALIDATION_GENERIC, 400)
    }
    if (receiptFile.size > MAX_RECEIPT_BYTES) {
      return errorResponse(ApiMessageCode.VALIDATION_GENERIC, 400)
    }
  }

  const updateData: Record<string, unknown> = {}

  if (totalStr !== null) {
    const totalValidation = Schemas.positiveAmount().safeParse(totalStr)
    if (!totalValidation.success) {
      return validationError(totalValidation)
    }
    updateData.total = totalValidation.data
  }

  if (estimatedArrivalStr !== null) {
    updateData.estimatedArrival = estimatedArrivalStr ? new Date(estimatedArrivalStr) : null
  }

  if (providerId !== null) {
    updateData.providerId = providerId || null
  }

  // Parse + validate the optional items array BEFORE opening the batch
  // so validation errors can still short-circuit with a 400.
  let itemRowsToInsert: Array<{
    id: string
    orderId: string
    productId: string
    productName: string
    quantity: number
    unitCost: number | null
    subtotal: number | null
  }> | null = null
  if (itemsJson) {
    let parsed: Array<{ productId: string; productName: string; quantity: number; unitCost?: number | null }>
    try {
      parsed = JSON.parse(itemsJson)
      const validation = z.array(orderItemSchema).safeParse(parsed)
      if (!validation.success) {
        return errorResponse(ApiMessageCode.ORDER_INVALID_ITEMS, 400)
      }
    } catch {
      return errorResponse(ApiMessageCode.ORDER_INVALID_ITEMS, 400)
    }
    itemRowsToInsert = parsed.map(item => ({
      id: nanoid(),
      orderId: id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitCost: item.unitCost ?? null,
      subtotal: item.unitCost != null ? Number((item.unitCost * item.quantity).toFixed(2)) : null,
    }))
  }

  // Run the order UPDATE and any items rewrite atomically, so a failure
  // after the order changes can't leave the row pointing at stale items.
  // Literal array + spread lets TS infer the mixed-statement tuple type.
  await db.batch([
    db.update(orders).set(updateData).where(eq(orders.id, id)),
    ...(itemRowsToInsert !== null
      ? [db.delete(orderItems).where(eq(orderItems.orderId, id))]
      : []),
    ...(itemRowsToInsert !== null && itemRowsToInsert.length > 0
      ? [db.insert(orderItems).values(itemRowsToInsert)]
      : []),
  ])

  return successResponse({})
})

/**
 * DELETE /api/businesses/[businessId]/orders/[id]
 *
 * Delete an order and its items.
 */
export const DELETE = withBusinessAuth(async (request, access, routeParams) => {
  // Only partners and owners can delete orders
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

  // Delete order (cascade will delete items)
  await db.delete(orders).where(eq(orders.id, id))

  return successResponse({})
})
