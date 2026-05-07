import { db, sales, saleItems } from '@/db'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import type { PaymentMethod } from '@kasero/shared/types/sale'

/**
 * All four queries window on `sales.date` (the user-facing back-dateable
 * date), matching the existing `computeStats` precedent in
 * `src/app/api/businesses/[businessId]/sales/route.ts`. Uses the existing
 * `idx_sales_business_date` composite index on (business_id, date).
 *
 * Hour buckets are UTC. Documented limitation — see startOfUtcDay in
 * `src/lib/sales-helpers.ts` for the v1.1 locale-aware-buckets todo.
 */

export interface DailyRevenueRow {
  day: string
  total: number
}

export interface TopProductRow {
  productId: string | null
  productName: string
  quantity: number
  revenue: number
}

export interface PaymentSplitRow {
  paymentMethod: PaymentMethod
  total: number
}

export interface HourlyRow {
  hour: number
  total: number
}

export async function queryDailyRevenue(
  businessId: string,
  since: Date,
): Promise<DailyRevenueRow[]> {
  const dayExpr = sql<string>`date(${sales.date}, 'unixepoch')`
  return db
    .select({
      day: dayExpr,
      total: sql<number>`SUM(${sales.total})`,
    })
    .from(sales)
    .where(and(eq(sales.businessId, businessId), gte(sales.date, since)))
    .groupBy(dayExpr)
    .orderBy(dayExpr)
    .all()
}

export async function queryTopProducts(
  businessId: string,
  since: Date,
): Promise<TopProductRow[]> {
  const revenueExpr = sql<number>`SUM(${saleItems.quantity} * ${saleItems.unitPrice})`
  return db
    .select({
      productId: saleItems.productId,
      productName: saleItems.productName,
      quantity: sql<number>`SUM(${saleItems.quantity})`,
      revenue: revenueExpr,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(eq(sales.businessId, businessId), gte(sales.date, since)))
    .groupBy(saleItems.productId, saleItems.productName)
    .orderBy(desc(revenueExpr))
    .limit(10)
    .all()
}

export async function queryPaymentSplit(
  businessId: string,
  since: Date,
): Promise<PaymentSplitRow[]> {
  return db
    .select({
      paymentMethod: sales.paymentMethod,
      total: sql<number>`SUM(${sales.total})`,
    })
    .from(sales)
    .where(and(eq(sales.businessId, businessId), gte(sales.date, since)))
    .groupBy(sales.paymentMethod)
    .all()
}

export async function queryHourly(
  businessId: string,
  since: Date,
): Promise<HourlyRow[]> {
  const hourExpr = sql<number>`CAST(strftime('%H', ${sales.date}, 'unixepoch') AS INTEGER)`
  return db
    .select({
      hour: hourExpr,
      total: sql<number>`SUM(${sales.total})`,
    })
    .from(sales)
    .where(and(eq(sales.businessId, businessId), gte(sales.date, since)))
    .groupBy(hourExpr)
    .orderBy(hourExpr)
    .all()
}
