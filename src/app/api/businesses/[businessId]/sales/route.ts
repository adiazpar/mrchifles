import { db, sales, saleItems, products, businesses } from '@/db'
import { eq, inArray, and, or, sql, desc, gte, lt, lte } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import {
  withBusinessAuth,
  enforceMaxContentLength,
  errorResponse,
  successResponse,
  validationError,
} from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { roundToCurrencyDecimals, startOfUtcDay, startOfPrevUtcDay } from '@/lib/sales-helpers'
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
      stock: products.stock,
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

  // Stock validation. Reject the whole batch if any line exceeds current
  // stock. The picker UI prevents over-adding for a single user, but two
  // cashiers committing the last 6 of a 6-stock product simultaneously
  // can only race here — first commit wins, second gets a 409 and the
  // client re-fetches products + offers trim-to-available on retry.
  const hasInsufficientStock = body.items.some((item) => {
    const product = productsMap.get(item.productId)!
    return item.quantity > (product.stock ?? 0)
  })
  if (hasInsufficientStock) {
    return errorResponse(ApiMessageCode.SALE_INSUFFICIENT_STOCK, 409)
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
  // spec section 12 risk #6 for the multi-replica caveat. Note: if the
  // db.batch below fails after this UPDATE succeeds, the counter has
  // advanced and the reserved number is unused — a normal POS gap. See
  // design spec section 12 risk #5.
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

  // Items: subtotal is a computed field (not stored in sale_items) — the
  // GET routes recompute it the same way (roundToCurrencyDecimals(qty * unitPrice, currency)).
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

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

/**
 * GET /api/businesses/[businessId]/sales
 *
 * List sales with their items, sorted by date DESC. Supports keyset
 * pagination via `?cursor=<saleId>` and optional `?include=stats`.
 *
 * Filters: from (ISO), to (ISO), paymentMethod.
 */
export const GET = withBusinessAuth(async (request, access) => {
  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  const paymentMethodParam = searchParams.get('paymentMethod')
  const limitParam = searchParams.get('limit')
  const cursorParam = searchParams.get('cursor')
  const includeParam = searchParams.get('include')

  const parsedLimit = limitParam ? parseInt(limitParam, 10) : NaN
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(1, parsedLimit), MAX_LIMIT)
    : DEFAULT_LIMIT

  const conditions = [eq(sales.businessId, access.businessId)]
  if (fromParam) conditions.push(gte(sales.date, new Date(fromParam)))
  if (toParam) conditions.push(lte(sales.date, new Date(toParam)))
  if (paymentMethodParam === 'cash' || paymentMethodParam === 'card' || paymentMethodParam === 'other') {
    conditions.push(eq(sales.paymentMethod, paymentMethodParam))
  }

  // Keyset pagination: load the cursor's date and id, then continue from
  // anything strictly older in (date DESC, id DESC) order. The compound
  // predicate is required because two sales can share the same `date`
  // value (rapid ringup, backdates colliding on day boundaries) — a
  // date-only predicate would silently skip the rest of the tied bucket.
  if (cursorParam) {
    const cursorRow = await db
      .select({ date: sales.date, id: sales.id })
      .from(sales)
      .where(and(eq(sales.id, cursorParam), eq(sales.businessId, access.businessId)))
      .get()
    if (cursorRow) {
      conditions.push(
        or(
          lt(sales.date, cursorRow.date),
          and(eq(sales.date, cursorRow.date), lt(sales.id, cursorRow.id)),
        )!
      )
    }
  }

  const rows = await db
    .select()
    .from(sales)
    .where(and(...conditions))
    .orderBy(desc(sales.date), desc(sales.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? slice[slice.length - 1].id : null

  // Hydrate items.
  const saleIds = slice.map((s) => s.id)
  const items = saleIds.length
    ? await db.select().from(saleItems).where(inArray(saleItems.saleId, saleIds))
    : []
  const itemsBySaleId = new Map<string, typeof items>()
  for (const item of items) {
    const list = itemsBySaleId.get(item.saleId) ?? []
    list.push(item)
    itemsBySaleId.set(item.saleId, list)
  }

  const currency = access.businessCurrency ?? 'USD'

  const expandedSales = slice.map((sale) => ({
    id: sale.id,
    saleNumber: sale.saleNumber,
    date: sale.date.toISOString(),
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    notes: sale.notes,
    items: (itemsBySaleId.get(sale.id) ?? []).map((it) => ({
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      subtotal: roundToCurrencyDecimals(it.quantity * it.unitPrice, currency),
    })),
    createdByUserId: sale.createdByUserId,
    createdAt: sale.createdAt.toISOString(),
  }))

  // Optional inline stats.
  let stats: StatsResult | undefined
  if (includeParam?.split(',').includes('stats')) {
    stats = await computeStats(access.businessId)
  }

  return successResponse({
    sales: expandedSales,
    nextCursor,
    ...(stats !== undefined ? { stats } : {}),
  })
})

interface StatsResult {
  todayRevenue: number
  todayCount: number
  todayAvgTicket: number | null
  yesterdayRevenue: number
  vsYesterdayPct: number | null
}

async function computeStats(businessId: string): Promise<StatsResult> {
  const now = new Date()
  const todayStart = startOfUtcDay(now)
  const yesterdayStart = startOfPrevUtcDay(now)

  const todayRows = await db
    .select({ total: sales.total })
    .from(sales)
    .where(and(eq(sales.businessId, businessId), gte(sales.date, todayStart)))

  const yesterdayRows = await db
    .select({ total: sales.total })
    .from(sales)
    .where(
      and(
        eq(sales.businessId, businessId),
        gte(sales.date, yesterdayStart),
        lt(sales.date, todayStart),
      ),
    )

  const todayRevenue = todayRows.reduce((acc, r) => acc + r.total, 0)
  const todayCount = todayRows.length
  const yesterdayRevenue = yesterdayRows.reduce((acc, r) => acc + r.total, 0)
  const todayAvgTicket = todayCount > 0 ? todayRevenue / todayCount : null
  const vsYesterdayPct =
    yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : null

  return {
    todayRevenue,
    todayCount,
    todayAvgTicket,
    yesterdayRevenue,
    vsYesterdayPct,
  }
}
