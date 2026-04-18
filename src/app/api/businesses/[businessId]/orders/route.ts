import { db, orders, orderItems, providers, products, businesses, users } from '@/db'
import { eq, desc, inArray, and, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'

const orderItemSchema = z.object({
  productId: Schemas.id(),
  productName: Schemas.name(),
  quantity: z.number().int().positive(),
  unitCost: z.number().nonnegative().optional().nullable(),
})

/**
 * GET /api/businesses/[businessId]/orders
 *
 * List all orders for the business with their items.
 */
export const GET = withBusinessAuth(async (request, access) => {
  const { searchParams } = new URL(request.url)
  const providerIdFilter = searchParams.get('providerId')

  const whereClause = providerIdFilter
    ? and(eq(orders.businessId, access.businessId), eq(orders.providerId, providerIdFilter))
    : eq(orders.businessId, access.businessId)

  // Get all orders for this business
  const ordersList = await db
    .select()
    .from(orders)
    .where(whereClause)
    .orderBy(desc(orders.date))

  const orderIds = ordersList.map(o => o.id)

  // Early return if no orders
  if (orderIds.length === 0) {
    return successResponse({ orders: [] })
  }

  // Get order items only for these orders (not all items in DB)
  const allItems = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      unitCost: orderItems.unitCost,
      subtotal: orderItems.subtotal,
      receivedQuantity: orderItems.receivedQuantity,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))

  // Get unique product IDs from items
  const productIds = [...new Set(allItems.map(i => i.productId).filter(Boolean))] as string[]

  // Fetch only needed product fields (NO icons - major bandwidth savings)
  const productsList = productIds.length > 0
    ? await db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          costPrice: products.costPrice,
          stock: products.stock,
          active: products.active,
        })
        .from(products)
        .where(inArray(products.id, productIds))
    : []

  const productsMap = new Map(productsList.map(p => [p.id, p]))

  // Get providers for this business
  const providersList = await db
    .select()
    .from(providers)
    .where(eq(providers.businessId, access.businessId))

  const providersMap = new Map(providersList.map(p => [p.id, p]))

  // Creator expansion — fetch the slim user shape for any creators
  // referenced by these orders. Skipped entirely if no order has a
  // creator (only possible for legacy rows).
  const creatorIds = [
    ...new Set(ordersList.map(o => o.createdByUserId).filter(Boolean)),
  ] as string[]
  const creatorsList = creatorIds.length > 0
    ? await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, creatorIds))
    : []
  const creatorsMap = new Map(creatorsList.map(u => [u.id, u]))

  // Group items by orderId for efficient lookup
  const itemsByOrderId = new Map<string, typeof allItems>()
  for (const item of allItems) {
    const existing = itemsByOrderId.get(item.orderId) || []
    existing.push(item)
    itemsByOrderId.set(item.orderId, existing)
  }

  // Build expanded orders
  const expandedOrders = ordersList.map(order => {
    const items = itemsByOrderId.get(order.id) || []
    return {
      ...order,
      providerId: order.providerId,
      expand: {
        provider: order.providerId ? providersMap.get(order.providerId) || null : null,
        createdByUser: order.createdByUserId ? creatorsMap.get(order.createdByUserId) || null : null,
        'order_items(order)': items.map(item => ({
          ...item,
          expand: {
            product: item.productId ? productsMap.get(item.productId) || null : null,
          },
        })),
      },
    }
  })

  return successResponse({ orders: expandedOrders })
})

/**
 * POST /api/businesses/[businessId]/orders
 *
 * Create a new order with items.
 */
export const POST = withBusinessAuth(async (request, access) => {
  const MAX_RECEIPT_BYTES = 5 * 1024 * 1024
  const ACCEPTED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']

  const formData = await request.formData()
  const dateStr = formData.get('date') as string
  const totalStr = formData.get('total') as string
  const status = formData.get('status') as string
  const estimatedArrivalStr = formData.get('estimatedArrival') as string | null
  const providerId = formData.get('providerId') as string | null
  const itemsJson = formData.get('items') as string
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

  // Parse and validate items
  let items: Array<{ productId: string; productName: string; quantity: number; unitCost?: number | null }>
  try {
    items = JSON.parse(itemsJson)
    const validation = z.array(orderItemSchema).safeParse(items)
    if (!validation.success) {
      return errorResponse(ApiMessageCode.ORDER_INVALID_ITEMS, 400)
    }
  } catch {
    return errorResponse(ApiMessageCode.ORDER_INVALID_ITEMS, 400)
  }

  const totalValidation = Schemas.positiveAmount().safeParse(totalStr)
  if (!totalValidation.success) {
    return validationError(totalValidation)
  }
  const total = totalValidation.data

  const orderId = nanoid()
  const orderDate = new Date(dateStr)
  const orderStatus = status === 'received' ? 'received' : 'pending'
  const estimatedArrival = estimatedArrivalStr ? new Date(estimatedArrivalStr) : null

  // Per-business sequential reference ("#47"). Pulled from a monotonic
  // counter on the businesses row via atomic UPDATE ... RETURNING, so
  // numbers are stable even after deletes and safe under concurrent
  // inserts. The returned value is the number to use for THIS order;
  // the stored next_order_number has already been incremented.
  const reservation = await db
    .update(businesses)
    .set({ nextOrderNumber: sql`${businesses.nextOrderNumber} + 1` })
    .where(eq(businesses.id, access.businessId))
    .returning({ reserved: sql<number>`${businesses.nextOrderNumber} - 1` })
  const orderNumber = Number(reservation[0]?.reserved ?? 1)

  // Batch insert order + items in a single transaction
  const itemValues = items.map(item => ({
    id: nanoid(),
    orderId,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitCost: item.unitCost ?? null,
    subtotal: item.unitCost != null ? Number((item.unitCost * item.quantity).toFixed(2)) : null,
  }))

  await db.batch([
    db.insert(orders).values({
      id: orderId,
      businessId: access.businessId,
      providerId: providerId || null,
      createdByUserId: access.userId,
      orderNumber,
      date: orderDate,
      total,
      status: orderStatus,
      estimatedArrival,
      receipt: null,
      notes: null,
    }),
    ...(itemValues.length > 0
      ? [db.insert(orderItems).values(itemValues)]
      : []),
  ])

  // Look up provider if needed
  let provider = null
  if (providerId) {
    provider = await db
      .select()
      .from(providers)
      .where(eq(providers.id, providerId))
      .get() || null
  }

  // Slim creator shape so the list can render "Ordered by:" without a
  // refetch. Safe to expose name/email — the caller already has access
  // to this business.
  const createdByUser = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, access.userId))
    .get() || null

  // Return full expanded order so client can append without refetching
  return successResponse({
    order: {
      id: orderId,
      businessId: access.businessId,
      providerId: providerId || null,
      createdByUserId: access.userId,
      orderNumber,
      date: orderDate,
      total,
      status: orderStatus,
      estimatedArrival,
      receipt: null,
      notes: null,
      expand: {
        provider,
        createdByUser,
        'order_items(order)': itemValues.map(item => ({
          ...item,
          receivedQuantity: null,
          expand: { product: null },
        })),
      },
    },
  })
})
