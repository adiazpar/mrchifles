import { withBusinessAuth, successResponse } from '@/lib/api-middleware'
import { roundToCurrencyDecimals, startOfUtcDay } from '@/lib/sales-helpers'
import {
  queryDailyRevenue,
  queryTopProducts,
  queryPaymentSplit,
  queryHourly,
} from './queries'
import {
  padDailyRevenue,
  padHourly,
  pivotPaymentSplit,
} from './aggregate-helpers'

/**
 * GET /api/businesses/[businessId]/sales/aggregate
 *
 * Returns a bundled response for the no-session sales-reports surface:
 * - dailyRevenue: last 7 days, zero-padded
 * - topProducts: top 10 by revenue, last 30 days
 * - paymentSplit: { cash, card, other }, last 7 days
 * - hourly: 24-hour buckets aggregated across the last 7 days (UTC)
 *
 * Multi-tenant isolation via withBusinessAuth + WHERE business_id = ?.
 * No explicit rate limit — this is a read; withBusinessAuth auto-RLs
 * mutations only, and the four indexed group-bys over a small window
 * stay well within typical read budget.
 */
export const GET = withBusinessAuth(async (_request, access) => {
  const now = new Date()
  const today = startOfUtcDay(now)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6) // inclusive of today
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)

  const currency = access.businessCurrency ?? 'USD'
  const businessId = access.businessId

  const [dailyRows, topProductRows, splitRows, hourlyRows] = await Promise.all([
    queryDailyRevenue(businessId, sevenDaysAgo),
    queryTopProducts(businessId, thirtyDaysAgo),
    queryPaymentSplit(businessId, sevenDaysAgo),
    queryHourly(businessId, sevenDaysAgo),
  ])

  return successResponse({
    dailyRevenue: padDailyRevenue(dailyRows, sevenDaysAgo, today, currency),
    topProducts: topProductRows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      quantity: r.quantity,
      revenue: roundToCurrencyDecimals(r.revenue, currency),
    })),
    paymentSplit: pivotPaymentSplit(splitRows, currency),
    hourly: padHourly(hourlyRows, currency),
  })
})
