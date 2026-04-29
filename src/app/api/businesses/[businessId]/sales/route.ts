import { db, sales, saleItems, products, businesses } from '@/db'
import { eq, inArray, and, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import {
  withBusinessAuth,
  enforceMaxContentLength,
  errorResponse,
  successResponse,
  validationError,
} from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { roundToCurrencyDecimals } from '@/lib/sales-helpers'
import { postSaleSchema } from './schema'

// 64KB easily covers 100 lines + 1000-char notes.
const POST_MAX_BODY_BYTES = 64 * 1024

// Date constraints: max +1min in the future for clock skew, min 1 year ago.
const ONE_MINUTE_MS = 60 * 1000
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

/**
 * POST /api/businesses/[businessId]/sales
 *
 * Create a sale. Any active business member (owner, partner, employee) can
 * ring up sales — no canManageBusiness gate (matches the orders/[id]/receive
 * floor-staff policy). Server snapshots prices, decrements stock atomically,
 * and assigns a sequential saleNumber.
 */
export const POST = withBusinessAuth(async (request, access) => {
  const oversize = enforceMaxContentLength(request, POST_MAX_BODY_BYTES)
  if (oversize) return oversize

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return errorResponse(ApiMessageCode.VALIDATION_GENERIC, 400)
  }

  const parsed = postSaleSchema.safeParse(raw)
  if (!parsed.success) return validationError(parsed)
  const body = parsed.data

  // Date validation: backdate up to 1 year, future tolerance 1 minute.
  const now = new Date()
  const saleDate = body.date ? new Date(body.date) : now
  if (
    saleDate.getTime() > now.getTime() + ONE_MINUTE_MS ||
    saleDate.getTime() < now.getTime() - ONE_YEAR_MS
  ) {
    return errorResponse(ApiMessageCode.SALE_INVALID_DATE, 400)
  }

  // Look up products in one batched SELECT.
  const productIds = body.items.map((i) => i.productId)
  const productsList = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      active: products.active,
    })
    .from(products)
    .where(and(eq(products.businessId, access.businessId), inArray(products.id, productIds)))

  const productsMap = new Map(productsList.map((p) => [p.id, p]))

  // Reject if any productId is missing or inactive.
  for (const item of body.items) {
    const product = productsMap.get(item.productId)
    if (!product) {
      return errorResponse(ApiMessageCode.SALE_PRODUCT_NOT_FOUND, 400, { productId: item.productId })
    }
    if (!product.active) {
      return errorResponse(ApiMessageCode.SALE_PRODUCT_INACTIVE, 400, { productId: item.productId, name: product.name })
    }
  }

  const currency = access.businessCurrency ?? 'USD'

  // Snapshot prices server-side. Compute line subtotals and total with
  // currency-appropriate rounding (matches orders/route.ts pattern).
  const lineRows = body.items.map((item) => {
    const product = productsMap.get(item.productId)!
    const unitPrice = product.price
    const subtotal = roundToCurrencyDecimals(unitPrice * item.quantity, currency)
    return {
      id: nanoid(),
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
      subtotal,
    }
  })
  const total = roundToCurrencyDecimals(
    lineRows.reduce((acc, r) => acc + r.subtotal, 0),
    currency,
  )

  // Reserve the next saleNumber atomically. UPDATE ... RETURNING is
  // atomic per-statement on libSQL (single-region Turso); see design
  // spec section 12 risk #6 for the multi-replica caveat.
  const reservation = await db
    .update(businesses)
    .set({ nextSaleNumber: sql`${businesses.nextSaleNumber} + 1` })
    .where(eq(businesses.id, access.businessId))
    .returning({ reserved: sql<number>`${businesses.nextSaleNumber} - 1` })
  const saleNumber = Number(reservation[0]?.reserved ?? 1)

  const saleId = nanoid()
  const createdAt = new Date()

  // Atomic batch: insert sale + items + decrement stock per line. libSQL
  // batch is all-or-nothing.
  await db.batch([
    db.insert(sales).values({
      id: saleId,
      businessId: access.businessId,
      saleNumber,
      createdByUserId: access.userId,
      date: saleDate,
      total,
      paymentMethod: body.paymentMethod,
      notes: body.notes ?? null,
      createdAt,
    }),
    db.insert(saleItems).values(
      lineRows.map((r) => ({
        id: r.id,
        saleId,
        productId: r.productId,
        productName: r.productName,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
      })),
    ),
    ...lineRows.map((r) =>
      db
        .update(products)
        .set({ stock: sql`${products.stock} - ${r.quantity}` })
        .where(and(eq(products.id, r.productId), eq(products.businessId, access.businessId))),
    ),
  ])

  return successResponse({
    sale: {
      id: saleId,
      saleNumber,
      date: saleDate.toISOString(),
      total,
      paymentMethod: body.paymentMethod,
      notes: body.notes ?? null,
      items: lineRows.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        subtotal: r.subtotal,
      })),
      createdByUserId: access.userId,
      createdAt: createdAt.toISOString(),
    },
  })
})
