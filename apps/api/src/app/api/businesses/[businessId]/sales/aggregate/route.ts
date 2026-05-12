import { withBusinessAuth, successResponse } from '@/lib/api-middleware'
import { roundToCurrencyDecimals, startOfUtcDay } from '@kasero/shared/sales-helpers'
import {
  queryDailyRevenue,
  queryTopProducts,
  queryPaymentSplit,
  queryHourly,
  queryPreviousWeekRevenue,
} from './queries'
import {
  padDailyRevenue,
  padHourly,
  pivotPaymentSplit,
  normalizePreviousWeekRevenue,
} from './aggregate-helpers'

/**
 * GET /api/businesses/[businessId]/sales/aggregate
 *
 * Returns a bundled response for the no-session sales-reports surface:
 * - dailyRevenue: last 7 days, zero-padded
 * - previousWeekRevenue: scalar sum across the prior 7-day window,
 *   used by the Home "This week" trend card's vs-last-week delta
 * - topProducts: top 10 by revenue, last 30 days
 * - paymentSplit: { cash, card, other }, last 7 days
 * - hourly: 24-hour buckets aggregated across the last 7 days (UTC)
 *
 * Multi-tenant isolation via withBusinessAuth + WHERE business_id = ?.
 * No explicit rate limit — this is a read; withBusinessAuth auto-RLs
 * mutations only, and the indexed group-bys / scalar sum over a small
 * window stay well within typical read budget.
 */
export const GET = withBusinessAuth(async (_request, access) => {
  const now = new Date()
  const today = startOfUtcDay(now)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6) // inclusive of today
  // Previous 7-day window: the 7 calendar days immediately preceding
  // the current window. Inclusive lower bound = today − 13d; exclusive
  // upper bound = the current window's inclusive start (today − 6d) so
  // no sale is double-counted across the two windows.
  const fourteenDaysAgo = new Date(today)
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 13)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)

  const currency = access.businessCurrency ?? 'USD'
  const businessId = access.businessId

  const [
    dailyRows,
    topProductRows,
    splitRows,
    hourlyRows,
    previousWeekTotal,
  ] = await Promise.all([
    queryDailyRevenue(businessId, sevenDaysAgo),
    queryTopProducts(businessId, thirtyDaysAgo),
    queryPaymentSplit(businessId, sevenDaysAgo),
    queryHourly(businessId, sevenDaysAgo),
    queryPreviousWeekRevenue(businessId, fourteenDaysAgo, sevenDaysAgo),
  ])

  return successResponse({
    dailyRevenue: padDailyRevenue(dailyRows, sevenDaysAgo, today, currency),
    previousWeekRevenue: normalizePreviousWeekRevenue(
      previousWeekTotal,
      currency,
    ),
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
